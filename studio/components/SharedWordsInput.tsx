import { useEffect, useState } from "react";
import { type StringInputProps, type TextInputProps } from "sanity";

import { usePerspectiveClient } from "../lib/draftsClient";

type WordsInputProps = StringInputProps | TextInputProps;

function withPlaceholder(props: WordsInputProps, placeholder: string | undefined) {
  return props.renderDefault({
    ...props,
    elementProps: { ...props.elementProps, placeholder },
  } as WordsInputProps);
}

export function sharedWordsInput(query: string, params: Record<string, string> = {}) {
  return function SharedWordsInput(props: WordsInputProps) {
    const client = usePerspectiveClient("published");
    const [words, setWords] = useState<string>();

    useEffect(() => {
      let cancelled = false;
      client
        .fetch<string | null>(query, params)
        .then((value) => {
          if (!cancelled) setWords(value ?? undefined);
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, [client]);

    return withPlaceholder(props, words);
  };
}
