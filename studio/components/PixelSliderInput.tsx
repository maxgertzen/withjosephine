import { Button, Flex, Stack, Text } from "@sanity/ui";
import { useEffect, useRef, useState } from "react";
import { type NumberInputProps, set } from "sanity";

const SAVE_AFTER_DRAG_MS = 250;

export type PixelSlider = {
  min: number;
  max: number;
  step: number;
  standard: number;
  marks: { label: string; px: number }[];
};

export function pixelSliderInput({ min, max, step, standard, marks }: PixelSlider) {
  return function PixelSliderInput({ value, onChange, elementProps, readOnly }: NumberInputProps) {
    const saved = typeof value === "number" ? value : standard;
    const [dragged, setDragged] = useState<number | null>(null);
    const pendingSave = useRef<ReturnType<typeof setTimeout>>(undefined);
    const current = dragged ?? saved;

    useEffect(() => () => clearTimeout(pendingSave.current), []);

    function save(next: number) {
      clearTimeout(pendingSave.current);
      setDragged(null);
      onChange(set(next));
    }

    function drag(next: number) {
      setDragged(next);
      clearTimeout(pendingSave.current);
      pendingSave.current = setTimeout(() => save(next), SAVE_AFTER_DRAG_MS);
    }

    return (
      <Stack space={3}>
        <Flex align="center" gap={3}>
          <input
            {...elementProps}
            type="range"
            min={min}
            max={max}
            step={step}
            value={current}
            disabled={readOnly}
            onChange={(event) => drag(Number(event.currentTarget.value))}
            style={{ flex: 1 }}
          />
          <Text size={2} weight="semibold">
            {current} pixels
          </Text>
        </Flex>
        <Flex gap={2}>
          {marks.map((mark) => (
            <Button
              key={mark.label}
              mode={current === mark.px ? "default" : "ghost"}
              tone={current === mark.px ? "primary" : "default"}
              text={mark.label}
              fontSize={1}
              padding={2}
              disabled={readOnly}
              onClick={() => save(mark.px)}
            />
          ))}
        </Flex>
      </Stack>
    );
  };
}
