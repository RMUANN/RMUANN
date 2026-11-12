"use client";

import { useEffect, useId, useState } from "react";
import type { Locale } from "@/lib/routes";

const text = {
  en: { title: "Motion study", note: "Interactive illustration", slider: "Arm swing", play: "Play", pause: "Pause", image: "A figure with an adjustable arm swing" },
  zh: { title: "动作演示", note: "交互示意", slider: "手臂摆幅", play: "播放", pause: "暂停", image: "可调节手臂摆幅的人体示意图" },
};

function pose(phase: number, swing: number) {
  const step = Math.sin(phase);
  const lift = Math.sin(2 * phase) * 3;
  const shoulder = 127 + lift;
  const hip = 222 + lift;
  const travel = swing * step;
  return [
    [[259, 91 + lift], [251, 113 + lift], [248, shoulder], [230, hip]],
    [[248, shoulder], [218 - travel * 0.49, 159 + lift], [187 - travel, 174 + lift], [173 - travel, 158 + lift]],
    [[248, shoulder], [277 + travel * 0.42, 160 + lift], [309 + travel, 148 + lift], [325 + travel, 129 + lift]],
    [[230, hip], [205 + step * 14, 272 + lift], [181 + step * 20, 313], [160 + step * 20, 316]],
    [[230, hip], [261 - step * 12, 264 + lift], [286 - step * 24, 308], [306 - step * 24, 309]],
  ];
}

export default function MotionStudy({ locale }: { locale: Locale }) {
  const label = text[locale];
  const id = useId().replace(/:/g, "");
  const [swing, setSwing] = useState(55);
  const [phase, setPhase] = useState(0.95);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    let handle = 0;
    let previous: number | undefined;
    const animate = (time: number) => {
      const elapsed = previous === undefined ? 0 : Math.min(60, time - previous);
      previous = time;
      setPhase((value) => (value + elapsed * 0.0018) % (2 * Math.PI));
      handle = requestAnimationFrame(animate);
    };
    handle = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(handle);
  }, [playing]);

  const current = pose(phase, swing * 0.56);
  return (
    <figure className="motion-panel">
      <div className="motion-heading"><span>{label.title}</span><span>{label.note}</span></div>
      <svg className="motion-canvas" role="img" aria-label={label.image} viewBox="0 0 480 340">
        <defs>
          <pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 H 0 V 24" fill="none" stroke="#9eccc2" strokeOpacity=".16" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="480" height="340" fill={"url(#" + id + ")"} />
        <g fill="none" stroke="#80bfb0" strokeWidth="1.2" strokeDasharray="4 7" opacity=".65">
          <path d="M78 199 Q152 92 265 137 T418 104" />
          <path d="M90 277 Q220 323 385 268" />
        </g>
        <g fill="#82ceba"><circle cx="78" cy="199" r="3" /><circle cx="418" cy="104" r="3" /><circle cx="385" cy="268" r="3" /></g>
        {[-1.8, 1.55].map((offset, i) =>
          <g key={offset} fill="none" stroke={i ? "#65c6b0" : "#8cb0a6"} strokeWidth="3" opacity=".25">
            {pose(phase + offset, swing * 0.69).map((limb, j) =>
              <polyline key={j} points={limb.map((joint) => joint.join(",")).join(" ")} />)}
            <circle cx="259" cy="71" r="15" />
          </g>
        )}
        <g fill="none" stroke="#dcf4d3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4">
          {current.map((limb, i) => <polyline key={i} points={limb.map((joint) => joint.join(",")).join(" ")} />)}
          <circle cx="259" cy={current[0][0][1] - 17} r="15" />
        </g>
        <g fill="#183f38" stroke="#a9e5c4" strokeWidth="2">
          {current.flatMap((limb, i) => limb.slice(1, -1).map(([x, y], j) =>
            <circle key={i + "-" + j} cx={x} cy={y} r="4.1" />))}
        </g>
        <line x1="70" x2="416" y1="320" y2="320" stroke="#a1cbbf" strokeOpacity=".35" />
      </svg>
      <figcaption className="motion-controls">
        <button type="button" aria-pressed={playing} onClick={() => setPlaying(!playing)}><span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span> {playing ? label.pause : label.play}</button>
        <label><span>{label.slider}</span><input type="range" min="0" max="100" value={swing} onChange={(event) => setSwing(Number(event.currentTarget.value))} /></label>
        <output>{swing}%</output>
      </figcaption>
    </figure>
  );
}
