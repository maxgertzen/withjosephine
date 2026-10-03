type ReadingTitleBlockProps = {
  readingTag: string;
  readingName: string;
  readingPrice: string;
};

export function ReadingTitleBlock({
  readingTag,
  readingName,
  readingPrice,
}: ReadingTitleBlockProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-4 border-b border-j-border-subtle flex flex-col items-center text-center">
      {readingTag ? (
        <span className="font-body uppercase text-j-text-gold text-[0.6rem] tracking-[0.18em] md:text-[0.68rem] md:tracking-[0.22em]">
          {readingTag}
        </span>
      ) : null}
      <h1 className="m-0 font-display font-light italic leading-[1.1] text-j-text-heading text-balance text-[1.75rem] md:text-[2.4rem] mt-1 md:mt-2">
        {readingName}
      </h1>
      {readingPrice ? (
        <span className="font-display italic text-j-text-gold md:text-j-text-gold-lg text-[1rem] md:text-[1.5rem] mt-1 md:mt-2">
          {readingPrice}
        </span>
      ) : null}
    </div>
  );
}
