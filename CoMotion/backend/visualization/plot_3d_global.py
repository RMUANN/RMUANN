import torch
import matplotlib.pyplot as plt
import numpy as np
import io
import matplotlib
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import mpl_toolkits.mplot3d.axes3d as p3
import imageio


def plot_3d_motion(args, figsize=(10, 10), fps=20, radius=2.5):
    """
    人物位置上移、超级放大、无地板无边框的 3D 可视化
    """
    matplotlib.use('Agg')

    joints, out_name, title = args

    # [Frame, Joint, XYZ]
    data = joints.copy().reshape(len(joints), -1, 3)

    # ------------------- 坐标轴修正 -------------------
    # HumanML3D: Y 是高度 -> Matplotlib: Z 是高度
    data_viz = np.zeros_like(data)
    data_viz[..., 0] = data[..., 0]
    data_viz[..., 1] = data[..., 2]  # 深度 -> Y
    data_viz[..., 2] = data[..., 1]  # 高度 -> Z
    data = data_viz
    # ------------------------------------------------

    nb_joints = data.shape[1]

    # 骨骼连接定义
    if nb_joints == 21:  # SMPL
        smpl_kinetic_chain = [[0, 11, 12, 13, 14, 15], [0, 16, 17, 18, 19, 20],
                              [0, 1, 2, 3, 4], [3, 5, 6, 7], [3, 8, 9, 10]]
    else:  # HumanML3D (22 joints)
        smpl_kinetic_chain = [[0, 2, 5, 8, 11], [0, 1, 4, 7, 10],
                              [0, 3, 6, 9, 12, 15], [9, 14, 17, 19, 21], [9, 13, 16, 18, 20]]

    colors = ['red', 'blue', 'black', 'red', 'blue',
              'darkblue', 'darkblue', 'darkblue', 'darkblue', 'darkblue',
              'darkred', 'darkred', 'darkred', 'darkred', 'darkred']

    frame_number = data.shape[0]

    # --- 初始化画布 ---
    fig = plt.figure(figsize=figsize, dpi=96)
    if title is not None:
        fig.suptitle(title, fontsize=16)
    ax = fig.add_subplot(111, projection='3d')

    # 初始视角
    init_elev = 20
    init_azim = 90
    ax.view_init(elev=init_elev, azim=init_azim)

    frames_buffer = []

    for index in range(frame_number):
        ax.clear()

        # --- 1. 去除“盒子” ---
        ax.set_axis_off()

        # --- 2. 镜头设置 ---
        ax.view_init(elev=init_elev, azim=init_azim)

        # 【关键修改 A】放大倍数
        # dist 从 4.5 改为 3.5 (数值越小，离得越近，人物越大)
        ax.dist = 3.5

        # --- 3. 动态追踪 ---
        root_pos = data[index, 0, :]
        x_c, y_c, z_c = root_pos[0], root_pos[1], root_pos[2]

        # 【关键修改 B】位置上移
        # X, Y 轴保持以人为中心
        ax.set_xlim(x_c - radius / 2, x_c + radius / 2)
        ax.set_ylim(y_c - radius / 2, y_c + radius / 2)

        # Z 轴 (高度)：不再是 0 到 radius (2.5)
        # 而是改为 -0.5 到 2.0。总高度范围还是 2.5 米，保持不变。
        # 但这相当于把镜头中心点 (Center) 从 1.25m 降到了 0.75m。
        # 结果：人物(重心约1m)相对于画面中心会偏上，从而解决“太偏下”的问题。
        ax.set_zlim(-0.5, 2.0)

        # --- 绘制轨迹 (Trajectory) ---
        if index > 0:
            traj_x = data[:index + 1, 0, 0]
            traj_y = data[:index + 1, 0, 1]
            traj_z = np.zeros_like(traj_x)

            # 轨迹线
            ax.plot(traj_x, traj_y, traj_z, color='orange', linewidth=2, linestyle='--')
            # 当前位置点
            ax.scatter(root_pos[0], root_pos[1], 0, color='orange', s=20)

        # --- 绘制骨骼 ---
        for i, chain in enumerate(smpl_kinetic_chain):
            linewidth = 4.0 if i < 5 else 2.0
            x_vals = data[index, chain, 0]
            y_vals = data[index, chain, 1]
            z_vals = data[index, chain, 2]
            ax.plot(x_vals, y_vals, z_vals, linewidth=linewidth, color=colors[i % len(colors)])

        # --- 保存帧 ---
        io_buf = io.BytesIO()
        fig.savefig(io_buf, format='raw', dpi=96)
        io_buf.seek(0)

        arr = np.frombuffer(io_buf.getvalue(), dtype=np.uint8)
        total_pixels = arr.size / 4
        side_len = int(np.sqrt(total_pixels))

        if arr.size == side_len * side_len * 4:
            arr = arr.reshape(side_len, side_len, 4)
            arr = arr[:, :, :3]
        else:
            side_len_rgb = int(np.sqrt(arr.size / 3))
            arr = arr.reshape(side_len_rgb, side_len_rgb, 3)

        frames_buffer.append(arr)
        io_buf.close()

    plt.close()

    out_tensor = np.stack(frames_buffer, axis=0)
    return torch.from_numpy(out_tensor)


def draw_to_batch(smpl_joints_batch, title_batch=None, outname=None):
    batch_size = len(smpl_joints_batch)
    out = []

    if isinstance(smpl_joints_batch, torch.Tensor):
        smpl_joints_batch = smpl_joints_batch.detach().cpu().numpy()

    for i in range(batch_size):
        # 1. 生成视频
        video_tensor = plot_3d_motion(
            [smpl_joints_batch[i], None, title_batch[i] if title_batch is not None else None],
            radius=2.5  # 这个参数控制 XY 平面的视野宽度
        )
        out.append(video_tensor)

        # 2. 保存文件
        if outname is not None and outname[i] is not None:
            save_path = outname[i]
            print(f"[*] Saving animation to {save_path}...")
            video_np = video_tensor.numpy().astype(np.uint8)
            try:
                if save_path.endswith('.gif'):
                    imageio.mimsave(save_path, video_np, fps=20, loop=0)
                else:
                    imageio.mimsave(save_path, video_np, fps=20, macro_block_size=None)
            except Exception as e:
                print(f"[!] Error saving animation: {e}")

    if len(out) > 0:
        return torch.stack(out, axis=0)
    return None