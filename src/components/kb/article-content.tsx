type Props = {
  content: string;
};

export function ArticleContent({ content }: Props) {
  // Content is stored as HTML from the Tiptap rich text editor.
  // Sanitization is not needed here since content is created by admins only.
  return (
    <div
      className="prose prose-neutral dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
