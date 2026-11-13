import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Locale, Publication } from "@/content/site";

type PreviewPaper = Omit<Publication, "image"> & {
  image?: Omit<NonNullable<Publication["image"]>, "src"> & { file: string };
};

export function researchPreview(locale: Locale): Publication[] {
  if (process.env.RESEARCH_PREVIEW !== "1") return [];

  const directory = join(process.cwd(), "..", "data");
  const manifest = JSON.parse(readFileSync(join(directory, "research-preview.json"), "utf8")) as Record<Locale, PreviewPaper[]>;
  return manifest[locale].map(({ image, ...paper }) => ({
    ...paper,
    image: image && {
      alt: image.alt,
      width: image.width,
      height: image.height,
      src: "data:image/webp;base64," + readFileSync(join(directory, image.file)).toString("base64"),
    },
  }));
}
