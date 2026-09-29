import type { Language } from "@/lib/business";
import { TwoChairs } from "@/components/ink/meeting";
import { Sailboat } from "@/components/ink/vignettes";
import { copy } from "../copy";
import { CoverArt as Cover } from "./cover";
import { Porch as PorchScene } from "./porch";
import { AloneDesk as Alone, TablePlan as Plan } from "./plans";
import { SpendingTable as Spending } from "./spending";
import {
  FeeChart as Fees,
  GapChart as Gap,
  PlanDiagram as Plan7,
  SequencePanel as Seq,
} from "./charts";
import { Storm as StormScene } from "./storm";
import { Horizons as HorizonsScene } from "./horizons";
import { Containers as ContainersScene } from "./containers";
import { Canoe as CanoeScene, Harbour as HarbourScene } from "./harbour";

/*
 * The guide's illustrations. New drawings live in this folder; the site's
 * own drawings are reused where they already say the right thing (the two
 * chairs for the first meeting, the sailboat on the back cover).
 */

type Props = { lang: Language };

export const CoverArt = (p: Props) => <Cover lang={p.lang} />;
export const AloneDesk = (p: Props) => (
  <Alone label={copy[p.lang].opening.aloneCard} />
);
export const TablePlan = (p: Props) => (
  <Plan
    lang={p.lang}
    cards={copy[p.lang].opening.cards}
    centre={copy[p.lang].opening.centre}
  />
);
export const Porch = (p: Props) => (
  <PorchScene
    lang={p.lang}
    list={copy[p.lang].ch1.notebook}
    question={copy[p.lang].ch1.margin}
  />
);
export const SpendingTable = (p: Props) => <Spending lang={p.lang} />;
export const GapChart = (p: Props) => (
  <Gap lang={p.lang} labels={copy[p.lang].ch3.gapLabels} />
);
export const Storm = (p: Props) => <StormScene lang={p.lang} />;
export const SequencePanel = (p: Props & { mode: "saving" | "drawing" }) => (
  <Seq lang={p.lang} mode={p.mode} labels={copy[p.lang].ch4.panels} />
);
export const Canoe = (p: Props) => <CanoeScene lang={p.lang} />;
export const Horizons = (p: Props) => (
  <HorizonsScene lang={p.lang} labels={copy[p.lang].ch6.labels} />
);
export const Containers = (p: Props) => (
  <ContainersScene lang={p.lang} labels={copy[p.lang].ch7.containers} />
);
export const PlanDiagram = (p: Props) => (
  <Plan7
    lang={p.lang}
    containers={copy[p.lang].ch7.containers}
    centre={copy[p.lang].ch7.planCentre}
    effects={copy[p.lang].ch7.planEffects}
  />
);
export const FeeChart = (p: Props) => (
  <Fees lang={p.lang} labels={copy[p.lang].ch8.chartLabels} />
);
export const Harbour = (p: Props) => <HarbourScene lang={p.lang} />;
export const Meeting = (p: Props) => <TwoChairs lang={p.lang} />;
export const BackSailboat = (p: Props) => {
  void p;
  return <Sailboat />;
};
