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
    <li className="group relative -ml-2 first:ml-0 hover:z-10 focus-within:z-10">
      <button
        type="button"
        aria-label={isSelf ? `${visitor.name} (you)` : visitor.name}
        aria-describedby={cardId}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className={`flex size-9 items-center justify-center rounded-full text-foreground shadow-md ring-2 backdrop-blur-sm transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-foreground ${
          isSelf ? "ring-foreground/60" : "ring-background"
        }`}
        // A tint of their colour, like their cursor's name flag
        style={{ background: translucent(visitor.color, 0.45) }}
      >
        <Icon aria-hidden className="size-5" />
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
 * others, each an anonymous animal in their own colour. Hovering (or tapping) an avatar
 * shows their name and approximate location.
 */
export default function VisitorAvatars({ presence }: { presence: Presence }) {
  const { self, others } = presence;
  if (!self) return null;
  const shown = others.slice(0, MAX_SHOWN);
  const hidden = others.length - shown.length;

  return (
    <ul
      aria-label="People on this page"
      className="fixed bottom-4 left-4 z-40 flex items-center enter [--enter-y:8px]"
    >
      <Avatar visitor={self} isSelf />
      {shown.map((visitor) => (
        <Avatar key={visitor.id} visitor={visitor} isSelf={false} />
      ))}
      {hidden > 0 && (
        <li className="-ml-2 flex size-9 items-center justify-center rounded-full bg-default-500/30 text-xs font-semibold text-foreground ring-2 ring-background backdrop-blur-sm">
          +{hidden}
        </li>
      )}
    </ul>
  );
}
