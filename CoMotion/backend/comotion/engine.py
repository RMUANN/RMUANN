import hashlib
import os
import pickle
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional


@dataclass(frozen=True)
class EngineResult:
    mp4_path: Path
    npy_path: Path


@dataclass(frozen=True)
class EngineInitResult(EngineResult):
    actions: List[Dict[str, float]]
    base_tokens_path: Path
    text_feature_path: Path


@dataclass(frozen=True)
class SessionArtifacts:
    session_id: str
    prompt: str
    actions: List[Dict[str, float]]
    base_tokens_path: Path
    text_feature_path: Path


class MotionEngine:
    def warmup(self) -> None:
        return None

    def ready(self) -> bool:
        raise NotImplementedError

    def initialize(self, prompt: str, session_dir: Path, job_dir: Path) -> EngineInitResult:
        raise NotImplementedError

    def generate(
        self,
        session: SessionArtifacts,
        action_counts: Dict[str, int],
        job_dir: Path,
    ) -> EngineResult:
        raise NotImplementedError


class RealT2MEngine(MotionEngine):
    semantic_protos = [
        "walk", "jog", "run", "sprint",
        "turn left", "turn right", "spin", "rotate",
        "sit", "stand", "sit down", "stand up",
        "jump", "hop", "leap",
        "crouch", "bend", "kneel",
        "wave", "clap", "point", "reach", "pick up", "throw", "kick", "punch", "fight",
        "step forward", "step back", "sidestep", "zig-zag walk",
        "idle", "dance", "bow", "look around", "balance",
    ]

    def __init__(self, model_root: Path, device: str = "auto"):
        self.model_root = Path(model_root).resolve()
        self.device_name = device
        self._loaded = False
        self._load_error: Optional[str] = None

    def ready(self) -> bool:
        return self._loaded and self._load_error is None

    def warmup(self) -> None:
        self._ensure_loaded()

    def initialize(self, prompt: str, session_dir: Path, job_dir: Path) -> EngineInitResult:
        self._ensure_loaded()
        session_dir.mkdir(parents=True, exist_ok=True)
        job_dir.mkdir(parents=True, exist_ok=True)
        torch = self.torch
        np = self.np
        clip = self.clip

        text = clip.tokenize([prompt], truncate=True).to(self.device)
        with torch.inference_mode():
            text_feat_tensor = self.clip_model.encode_text(text).float()
            text_feat = text_feat_tensor[0].detach().cpu().numpy()
            base_tokens = self.trans_encoder.sample(text_feat_tensor[0:1], False)

        npy_path, mp4_path = self._decode_and_save(base_tokens, job_dir)
        t_txt = text_feat / (np.linalg.norm(text_feat) + 1e-8)
        base_tokens_path = session_dir / "base_tokens.pkl"
        text_feature_path = session_dir / "text_feature.pkl"
        with base_tokens_path.open("wb") as f:
            pickle.dump(base_tokens.detach().cpu(), f)
        with text_feature_path.open("wb") as f:
            pickle.dump(t_txt, f)

        sim_scores = self._T @ t_txt
        top_indices = np.argsort(sim_scores)[-6:][::-1]
        actions = [
            {"name": self.semantic_protos[int(idx)], "score": float((sim_scores[int(idx)] + 1.0) / 2.0)}
            for idx in top_indices
        ]
        return EngineInitResult(
            actions=actions,
            base_tokens_path=base_tokens_path,
            text_feature_path=text_feature_path,
            mp4_path=mp4_path,
            npy_path=npy_path,
        )

    def generate(
        self,
        session: SessionArtifacts,
        action_counts: Dict[str, int],
        job_dir: Path,
    ) -> EngineResult:
        self._ensure_loaded()
        job_dir.mkdir(parents=True, exist_ok=True)
        with session.base_tokens_path.open("rb") as f:
            base_tokens = pickle.load(f).to(self.device)
        with session.text_feature_path.open("rb") as f:
            text_feature = pickle.load(f)

        new_tokens = self._modify_tokens(base_tokens, text_feature, action_counts)
        npy_path, mp4_path = self._decode_and_save(new_tokens, job_dir)
        return EngineResult(mp4_path=mp4_path, npy_path=npy_path)

    def _ensure_loaded(self) -> None:
        if self._loaded:
            return
        cwd = Path.cwd()
        try:
            os.chdir(self.model_root)
            self._load()
            self._loaded = True
        except Exception as exc:
            self._load_error = str(exc)
            raise
        finally:
            os.chdir(cwd)

    def _choose_device(self):
        if self.device_name not in {"auto", "cpu", "cuda"}:
            raise ValueError("COMOTION_DEVICE must be one of auto, cpu, cuda")
        if self.device_name == "cuda":
            return self.torch.device("cuda")
        if self.device_name == "cpu":
            return self.torch.device("cpu")
        return self.torch.device("cuda" if self.torch.cuda.is_available() else "cpu")

    def _load(self) -> None:
        sys.path.insert(0, str(self.model_root))
        os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

        import imageio_ffmpeg
        import matplotlib
        import numpy as np
        import torch
        from sklearn.neighbors import NearestNeighbors  # noqa: F401

        matplotlib.use("Agg")
        if not hasattr(np, "float"):
            np.float = float
        if not hasattr(np, "int"):
            np.int = int
        import clip
        import models.t2m_trans as trans
        import models.vqvae as vqvae
        import options.option_transformer as option_trans
        import visualization.plot_3d_global as plot_3d
        from utils.motion_process import recover_from_ric

        os.environ["IMAGEIO_FFMPEG_EXE"] = imageio_ffmpeg.get_ffmpeg_exe()
        old_argv = sys.argv[:]
        sys.argv = ["GPT_eval_multi.py"]
        try:
            args = option_trans.get_args_parser()
        finally:
            sys.argv = old_argv
        args.dataname = "t2m"
        args.resume_pth = "pretrained/VQVAE/net_last.pth"
        args.resume_trans = "pretrained/VQTransformer_corruption05/net_best_fid.pth"
        args.down_t, args.depth, args.block_size = 2, 3, 51

        self.np = np
        self.torch = torch
        self.clip = clip
        self.plot_3d = plot_3d
        self.recover_from_ric = recover_from_ric
        self.imageio_ffmpeg = imageio_ffmpeg
        self.args = args
        self.device = self._choose_device()

        self.clip_model, _ = clip.load("ViT-B/32", device=self.device, jit=False, download_root="./clip_cache")
        if self.device.type == "cuda":
            clip.model.convert_weights(self.clip_model)
        self.clip_model.eval()
        for param in self.clip_model.parameters():
            param.requires_grad = False

        self.net = vqvae.HumanVQVAE(
            args,
            args.nb_code,
            args.code_dim,
            args.output_emb_width,
            args.down_t,
            args.stride_t,
            args.width,
            args.depth,
            args.dilation_growth_rate,
        ).to(self.device).eval()
        ckpt = torch.load(args.resume_pth, map_location="cpu")
        self.net.load_state_dict(ckpt["net"], strict=True)

        self.trans_encoder = trans.Text2Motion_Transformer(
            num_vq=args.nb_code,
            embed_dim=1024,
            clip_dim=args.clip_dim,
            block_size=args.block_size,
            num_layers=9,
            n_head=16,
            drop_out_rate=args.drop_out_rate,
            fc_rate=args.ff_rate,
        ).to(self.device).eval()
        ckpt = torch.load(args.resume_trans, map_location="cpu")
        self.trans_encoder.load_state_dict(ckpt["trans"], strict=True)

        self.mean = torch.from_numpy(np.load("./checkpoints/t2m/VQVAEV3_CB1024_CMT_H1024_NRES3/meta/mean.npy")).to(self.device)
        self.std = torch.from_numpy(np.load("./checkpoints/t2m/VQVAEV3_CB1024_CMT_H1024_NRES3/meta/std.npy")).to(self.device)

        with torch.inference_mode():
            self.embedding = self.net.vqvae.quantizer.codebook.detach().cpu().numpy()
        self._emb_n = self.embedding / (np.linalg.norm(self.embedding, axis=1, keepdims=True) + 1e-8)

        with torch.inference_mode():
            proto_tokens = clip.tokenize(self.semantic_protos, truncate=True).to(self.device)
            proto_vec = self.clip_model.encode_text(proto_tokens).float().detach().cpu().numpy()
        self._T = proto_vec / (np.linalg.norm(proto_vec, axis=1, keepdims=True) + 1e-8)
        self.S_proto = self._emb_n @ self._T.T
        self.proto_name_to_idx = {name: index for index, name in enumerate(self.semantic_protos)}

    def _decode_and_save(self, tokens, job_dir: Path):
        torch = self.torch
        np = self.np
        with torch.no_grad():
            pred_pose = self.net.forward_decoder(tokens)
            denorm = (pred_pose * self.std + self.mean).float()
            pred_xyz = self.recover_from_ric(denorm, 22)
            xyz = pred_xyz.reshape(1, -1, 22, 3).detach().cpu().numpy()

        npy_path = job_dir / "result.npy"
        gif_path = job_dir / "result.gif"
        mp4_path = job_dir / "result.mp4"
        np.save(npy_path, xyz)
        self.plot_3d.draw_to_batch(xyz, [""], [str(gif_path)])
        time.sleep(0.2)
        ffmpeg_exe = self.imageio_ffmpeg.get_ffmpeg_exe()
        subprocess.run(
            [
                ffmpeg_exe,
                "-y",
                "-f",
                "gif",
                "-i",
                str(gif_path),
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-preset",
                "fast",
                "-crf",
                "22",
                "-movflags",
                "faststart",
                str(mp4_path),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        self._to_baseline_cfr(mp4_path)
        return npy_path, mp4_path

    def _to_baseline_cfr(self, input_mp4: Path, fps: int = 30) -> None:
        out_mp4 = input_mp4.with_name(input_mp4.stem + "_baseline.mp4")
        ffmpeg_exe = self.imageio_ffmpeg.get_ffmpeg_exe()
        subprocess.run(
            [
                ffmpeg_exe,
                "-y",
                "-fflags",
                "+genpts",
                "-i",
                str(input_mp4),
                "-r",
                str(fps),
                "-vsync",
                "cfr",
                "-c:v",
                "libx264",
                "-profile:v",
                "baseline",
                "-level",
                "3.0",
                "-pix_fmt",
                "yuv420p",
                "-g",
                str(fps),
                "-x264-params",
                f"keyint={fps}:min-keyint={fps}:scenecut=0",
                "-movflags",
                "+faststart",
                "-an",
                str(out_mp4),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        out_mp4.replace(input_mp4)

    def _modify_tokens(self, base_tokens, text_feature, action_counts: Dict[str, int], steps: int = 6, replace_ratio: float = 0.10):
        np = self.np
        torch = self.torch
        np.random.seed(42)
        cand_pool_base = []
        for action_name, count in action_counts.items():
            if count <= 0:
                continue
            proto_idx = self.proto_name_to_idx[action_name]
            sims_to_proto = self.S_proto[:, proto_idx] if hasattr(self, "S_proto") else self._emb_n @ self._T[proto_idx]
            top_indices = np.argsort(sims_to_proto)[-(count * 2):]
            cand_pool_base.extend(top_indices.tolist())

        if not cand_pool_base:
            sim_global = self._emb_n @ text_feature
            cand_pool_base = np.argpartition(-sim_global, 32)[:32].tolist()

        cand_pool_base = list(set(cand_pool_base))
        new_tokens = base_tokens.clone()
        lam_neigh = 1.0
        with torch.inference_mode():
            safe_tokens = new_tokens[0].detach().cpu().numpy().copy()
            valid_mask = (safe_tokens >= 0) & (safe_tokens < self.embedding.shape[0])
            safe_tokens[~valid_mask] = 0
            base_embs = self.embedding[safe_tokens]
            prev_mean = -1.0

            for step in range(max(1, steps)):
                a = step / max(1, steps - 1)
                tcur = 1.2 + (0.5 - 1.2) * a
                norm_base = np.linalg.norm(base_embs, axis=1, keepdims=True) + 1e-8
                text_sims = (base_embs / norm_base) @ text_feature
                worst_pos = self._pick_worst_positions(text_sims, replace_ratio)

                for pos in worst_pos:
                    left_id = safe_tokens[pos - 1] if pos - 1 >= 0 else None
                    right_id = safe_tokens[pos + 1] if pos + 1 < len(safe_tokens) else None
                    current_token = int(safe_tokens[pos])
                    local_pool = list(set(cand_pool_base + [current_token]))
                    scores = [
                        float(self._emb_n[code_id] @ text_feature)
                        + lam_neigh * self._neighbor_score(code_id, left_id, right_id)
                        for code_id in local_pool
                    ]
                    probs = self._softmax_np(np.asarray(scores, dtype=np.float32), tcur)
                    pick = int(local_pool[np.random.choice(len(local_pool), p=probs)])
                    new_tokens[0, pos] = pick
                    safe_tokens[pos] = pick
                    base_embs[pos] = self.embedding[pick]

                cur_mean = float(text_sims.mean())
                if prev_mean > 0 and (cur_mean - prev_mean) < 1e-4:
                    break
                prev_mean = cur_mean
        return new_tokens

    def _neighbor_score(self, code_id, left_id, right_id) -> float:
        score = 0.0
        if left_id is not None and left_id >= 0:
            score += float(self._emb_n[code_id] @ self._emb_n[left_id])
        if right_id is not None and right_id >= 0:
            score += float(self._emb_n[code_id] @ self._emb_n[right_id])
        return score

    @staticmethod
    def _softmax_np(x, temperature: float):
        x = x - x.max()
        x = x / max(1e-6, temperature)
        ex = RealT2MEngine._np_exp(x)
        return ex / (ex.sum() + 1e-8)

    @staticmethod
    def _np_exp(x):
        import numpy as np

        return np.exp(x)

    @staticmethod
    def _pick_worst_positions(text_sims, ratio: float):
        import numpy as np

        k = min(len(text_sims) - 1, max(1, int(len(text_sims) * float(ratio))))
        return np.argpartition(text_sims, k)[:k]

