type Props = {
  html: string;
};

export function RichContentSection({ html }: Props) {
  if (!html) return null;

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </section>
  );
}
