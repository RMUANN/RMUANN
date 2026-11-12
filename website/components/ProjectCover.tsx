export default function ProjectCover({ slug }: { slug: string }) {
  if (slug === "comotion") return (
    <svg className="cover cover--motion" viewBox="0 0 560 210" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="#b4dfc8" opacity=".25">
        <path d="M0 52H560M0 105H560M0 157H560M70 0V210M140 0V210M210 0V210M280 0V210M350 0V210M420 0V210M490 0V210" />
        <path d="M57 146C130 35 260 169 340 84S480 60 518 91" strokeDasharray="5 7" strokeWidth="2" />
      </g>
      <g fill="none" stroke="#b8e1c5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="282" cy="46" r="13" />
        <path d="M282 61L270 83 255 127M270 83L223 96 195 81M270 83L305 105 337 78M255 127L225 154 192 174M255 127L293 151 313 179" />
      </g>
      <g fill="#dcf4d3"><circle cx="270" cy="83" r="4" /><circle cx="255" cy="127" r="4" /><circle cx="337" cy="78" r="4" /><circle cx="195" cy="81" r="4" /><circle cx="57" cy="146" r="4" /><circle cx="518" cy="91" r="4" /></g>
    </svg>
  );
  if (slug === "sandtouch") return (
    <svg className="cover cover--sand" viewBox="0 0 560 210" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle cx="400" cy="64" r="36" fill="#b46748" opacity=".52" />
      <g fill="none" stroke="#926248" strokeWidth="1.6" opacity=".78">
        {Array.from({length: 15}, (_, i) => <path key={i} d={"M-20 " + (87 + i * 8) + " C " + (100 + i * 5) + " " + (10 + i * 7) + ", " + (230 - i * 4) + " " + (152 + i * 7) + ", 333 " + (100 + i * 8) + " S 483 " + (75 + i * 6) + ", 575 " + (132 + i * 5)} />)}
      </g>
    </svg>
  );
  return (
    <svg className="cover cover--engineering" viewBox="0 0 560 210" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="#3b7963" strokeWidth="2">
        <path d="M105 105H200M230 105H330M360 105H455M215 90V52H345V90M215 120V158H345V120" />
        <rect x="84" y="92" width="22" height="26" rx="5" /><rect x="454" y="92" width="22" height="26" rx="5" />
      </g>
      <g fill="#376d5a"><circle cx="215" cy="105" r="15" /><circle cx="345" cy="105" r="15" /><circle cx="280" cy="52" r="5" /><circle cx="280" cy="158" r="5" /></g>
    </svg>
  );
}
