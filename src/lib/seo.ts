type PageMeta = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

export function pageMeta({ title, description, image, imageAlt }: PageMeta) {
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1360" },
    { property: "og:image:height", content: "768" },
    { property: "og:image:alt", content: imageAlt },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}
