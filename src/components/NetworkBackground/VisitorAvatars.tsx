"use client";

import { useId, useState } from "react";
import type { IconType } from "react-icons";
import {
  GiBearFace,
  GiBeaver,
  GiButterfly,
  GiCamel,
  GiCat,
  GiChameleonGlyph,
  GiCrab,
  GiDeer,
  GiDolphin,
  GiDuck,
  GiFlamingo,
  GiFox,
  GiGorilla,
  GiHedgehog,
  GiHorseHead,
  GiHummingbird,
  GiKangaroo,
  GiLadybug,
  GiLion,
  GiMonkey,
  GiOctopus,
  GiPanda,
  GiParrotHead,
  GiPenguin,
  GiRaccoonHead,
  GiSharkFin,
  GiSloth,
  GiSnail,
  GiSquirrel,
  GiSwan,
  GiTurtle,
  GiWolfHead,
} from "react-icons/gi";
import { ANIMALS, translucent, type Presence, type Visitor } from "./liveCursors";

const ANIMAL_ICONS: Record<(typeof ANIMALS)[number], IconType> = {
  Hedgehog: GiHedgehog,
  Hummingbird: GiHummingbird,
  Butterfly: GiButterfly,
  Flamingo: GiFlamingo,
  Dolphin: GiDolphin,
  Squirrel: GiSquirrel,
  Wolf: GiWolfHead,
  Kangaroo: GiKangaroo,
  Cat: GiCat,
  Bear: GiBearFace,
  Duck: GiDuck,
  Sloth: GiSloth,
  Fox: GiFox,
  Camel: GiCamel,
  Deer: GiDeer,
  Octopus: GiOctopus,
  Panda: GiPanda,
  Gorilla: GiGorilla,
  Turtle: GiTurtle,
  Penguin: GiPenguin,
  Beaver: GiBeaver,
  Shark: GiSharkFin,
  Crab: GiCrab,
  Parrot: GiParrotHead,
  Lion: GiLion,
  Swan: GiSwan,
  Snail: GiSnail,
  Ladybird: GiLadybug,
  Raccoon: GiRaccoonHead,
  Chameleon: GiChameleonGlyph,
  Horse: GiHorseHead,
  Monkey: GiMonkey,
};

/** Avatars beyond this collapse into a "+N" */
const MAX_SHOWN = 5;
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function placeName({ city, country }: Visitor) {
  let countryName: string | null = null;
  try {
    countryName = country ? (regionNames.of(country) ?? country) : null;
  } catch {
    countryName = country;
  }
  return [city, countryName].filter(Boolean).join(", ") || null;
}

function Avatar({ visitor, isSelf }: { visitor: Visitor; isSelf: boolean }) {
  const cardId = useId();
  // Touch screens have no hover: a tap opens the card
  const [open, setOpen] = useState(false);
  const Icon = ANIMAL_ICONS[ANIMALS[visitor.animal]];
  const place = placeName(visitor);

  return (
    <li className="group relative">
      <button
        type="button"
        aria-label={isSelf ? `${visitor.name} (you)` : visitor.name}
        aria-describedby={cardId}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className="flex size-8 items-center justify-center rounded-full border-[1.5px] backdrop-blur-[2px] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/60"
        // An outline in their colour, like their cursor
        style={{ borderColor: translucent(visitor.color, 0.75), color: translucent(visitor.color, 0.9) }}
      >
        <Icon aria-hidden className="size-[18px]" />
      </button>

      <div
        id={cardId}
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-0 mb-3 w-max max-w-64 rounded-xl bg-overlay px-3 py-2 text-overlay-foreground shadow-lg transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 ${
          open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
      >
        <p className="text-sm font-semibold">
          {visitor.name}
          {isSelf && <span className="font-normal text-overlay-foreground/60"> (you)</span>}
        </p>
        <p className="text-xs text-overlay-foreground/70">{place ?? "Location unknown"}</p>
        {isSelf && (
          <p className="mt-1 text-xs text-overlay-foreground/50">This is how others on the page see you</p>
        )}
      </div>
    </li>
  );
}

/**
 * Who is on the home page right now, Google Docs style: this visitor first, then the
 * others, each an anonymous animal outlined in their own colour. A side feature, so the
 * stack stays faint until it's hovered or focused; an avatar then shows the visitor's
 * name and approximate location (a tap does the same on touch screens).
 */
export default function VisitorAvatars({ presence }: { presence: Presence }) {
  const { self, others } = presence;
  if (!self) return null;
  const shown = others.slice(0, MAX_SHOWN);
  const hidden = others.length - shown.length;

  return (
    <ul
      data-network-overlay
      aria-label="People on this page"
      className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 opacity-50 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100 enter [--enter-y:8px]"
    >
      <Avatar visitor={self} isSelf />
      {shown.map((visitor) => (
        <Avatar key={visitor.id} visitor={visitor} isSelf={false} />
      ))}
      {hidden > 0 && (
        <li className="flex size-8 items-center justify-center rounded-full border-[1.5px] border-foreground/30 text-[11px] font-semibold text-foreground/70">
          +{hidden}
        </li>
      )}
    </ul>
  );
}
