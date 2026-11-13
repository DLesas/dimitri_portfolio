"use client";

import { useState } from "react";
import { Caption, KINDS, MAP, styleNumber, type Kind } from "./parts";

const { numbers, passages } = MAP.rows;
const LARGEST = Math.max(...passages.flatMap((p) => p.values.map(Math.abs)));
const ABOUT = [
  `The model turns a passage into ${MAP.dimensions.toLocaleString("en-GB")} numbers. Here are ${numbers.length} of them, the ones that differ most between this site's passages, as cells: blue above zero, amber below, stronger the further from it.`,
  "Another job on the same page gets a pattern much like it: many cells the same colour in the same places. No one told the model these were both jobs.",
  "A skill shares some of that pattern, but less of it.",
  "A section about animation physics looks different again. Similar meaning makes similar patterns, and that's what the search uses.",
].join(" ");
const label = (i: number) => MAP.points[passages[i].point].label;

/** A few of the site's passages as rows of coloured numbers, one under another so their patterns can be compared */
export function NumbersFigure({ title }: { title: string }) {
  const [column, setColumn] = useState(-1);

  return (
    <figure aria-label={title} className="my-10">
      <div className="space-y-3 py-2" onPointerLeave={() => setColumn(-1)}>
        {passages.map((passage, i) => {
          const kind = MAP.points[passage.point].kind as Kind;
          return (
            <div key={passage.point}>
              <div className="flex items-baseline gap-2 pb-1 text-[0.8rem]">
                <span className={`size-2 flex-none self-center rounded-full ${KINDS[kind].dot}`} />
                <span className="min-w-0 truncate font-medium text-foreground">{label(i)}</span>
                {i > 0 && (
                  <span className="ml-auto flex-none text-default-500 tabular-nums">
                    {passage.similarity.toFixed(2)} alike
                  </span>
                )}
              </div>
              <div className="grid grid-cols-[repeat(48,minmax(0,1fr))] gap-[2px]">
                {passage.values.map((value, j) => (
                  <span
                    key={j}
                    onPointerEnter={() => setColumn(j)}
                    className={`h-6 rounded-[2px] sm:h-7 ${value < 0 ? "bg-[#f5a524]" : "bg-primary"} ${column === j ? "ring-2 ring-foreground" : ""}`}
                    // Brightened towards the middle, so smaller numbers still show
                    style={{ opacity: styleNumber(0.15 + 0.85 * (Math.abs(value) / LARGEST) ** 0.6) }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <Caption>
        {column >= 0 ? (
          <>
            <strong className="font-semibold text-foreground">Number {numbers[column].toLocaleString("en-GB")} of {MAP.dimensions.toLocaleString("en-GB")}:</strong>{" "}
            {passages.map((p) => `${p.values[column] > 0 ? "+" : ""}${p.values[column].toFixed(3)}`).join(", ")}
            . No single number means anything by itself; the meaning is in the pattern.
          </>
        ) : (
          ABOUT
        )}
      </Caption>
    </figure>
  );
}
