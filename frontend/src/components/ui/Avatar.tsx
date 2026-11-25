import { initials } from "../../services/format";

const avatarPalettes = [
  ["#EDE7FB", "#5B4B9E"],
  ["#FBE9DF", "#8A4B32"],
  ["#E8F0E9", "#3F5D45"],
  ["#E5EEF5", "#345A73"],
];

export function Avatar({
  name,
  size = 38,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const index = name.charCodeAt(0) % avatarPalettes.length;
  const [background, color] = avatarPalettes[index];
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, background, color, fontSize: size * 0.34 }}
      aria-hidden="true"
    >
      {initials(name) || "AP"}
    </span>
  );
}
