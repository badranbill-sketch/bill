"use client";
import { useState } from "react";
import { compareFees } from "@/lib/fees";
import type { Language } from "@/lib/business";
export function Fees({ lang }: { lang: Language }) {
  const fr = lang === "fr";
  const [values, setValues] = useState(["100000", "25", "1"]);
  const nums = values.map(Number);
  let result: ReturnType<typeof compareFees> | null = null;
  try {
    if (values.some((x) => x.trim() === "")) throw Error();
    result = compareFees(nums[0], nums[1], nums[2]);
  } catch {}
  const labels = fr
    ? [
        "Montant initial ($ CA)",
        "Durée (années)",
        "Frais supplémentaires (% par an)",
      ]
    : [
        "Initial amount (CAD)",
        "Time frame (years)",
        "Additional fees (% per year)",
      ];
  const limits = [
    [0, 10000000, 1000],
    [0, 50, 1],
    [0, 5, 0.25],
  ];
  const money = (v: number) =>
    new Intl.NumberFormat(fr ? "fr-CA" : "en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(v);
  // "1,25 %" in French, "1.25%" in English.
  const pct = (v: number) => {
    const n = new Intl.NumberFormat(fr ? "fr-CA" : "en-CA", {
      maximumFractionDigits: 2,
    }).format(v);
    return fr ? `${n}\u00a0%` : `${n}%`;
  };
  return (
    <div className="tool-grid">
      <div>
        {values.map((v, i) => (
          <div className="field" key={i}>
            <label htmlFor={`number-${i}`}>{labels[i]}</label>
            <div className="range-pair">
              <input
                aria-label={`${labels[i]} — ${fr ? "curseur" : "slider"}`}
                type="range"
                min={limits[i][0]}
                max={limits[i][1]}
                step={limits[i][2]}
                value={Number.isFinite(nums[i]) ? nums[i] : 0}
                onChange={(e) =>
                  setValues(
                    values.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
              />
              <input
                id={`number-${i}`}
                type="number"
                min={limits[i][0]}
                max={limits[i][1]}
                step={i === 0 ? "any" : limits[i][2]}
                value={v}
                onChange={(e) =>
                  setValues(
                    values.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
              />
            </div>
          </div>
        ))}
        <p className="form-hint">
          {fr
            ? "Hypothèses simplifiées\u00a0: rendement brut constant de 6\u00a0% par année, frais de base de 1\u00a0%, frais supplémentaires ajustables. Aucun impôt, retrait ni cotisation. Aucune inflation."
            : "Simplified assumptions: constant 6% gross annual return, 1% base fees and adjustable additional fees. No taxes, withdrawals or contributions. No inflation."}
        </p>
        <p className="form-hint">
          {fr
            ? "Calcul annuel\u00a0: capital × (1 + 0,06 − frais) ^ années. Ces frais ne sont pas ceux de Bill. Le résultat n’est ni une prévision ni une économie promise."
            : "Annual calculation: principal × (1 + 0.06 − fees) ^ years. These are not Bill’s fees. The result is neither a forecast nor promised savings."}
        </p>
      </div>
      <div aria-live="polite">
        {!result ? (
          <p className="error" role="alert">
            {fr
              ? "Entrez un montant de 0 à 10\u00a0000\u00a0000, une durée entière de 0 à 50 ans et des frais supplémentaires de 0 à 5\u00a0%."
              : "Enter an amount from 0 to 10,000,000, a whole number of years from 0 to 50, and additional fees from 0 to 5%."}
          </p>
        ) : (
          <>
            <p>
              {fr
                ? "Différence entre les soldes finaux illustratifs"
                : "Difference between illustrative ending balances"}
            </p>
            <p className="result">{money(result.difference)}</p>
            <div
              className="bar-chart"
              role="img"
              aria-label={
                fr
                  ? `Soldes : ${money(result.base)} et ${money(result.extra)}.`
                  : `Balances: ${money(result.base)} and ${money(result.extra)}.`
              }
            >
              <div className="bar-row">
                <span>
                  {fr
                    ? `Frais de base\u00a0: ${pct(1)}`
                    : `Base fees: ${pct(1)}`}
                </span>
                <div className="bar" style={{ width: "100%" }} />
                <strong>{money(result.base)}</strong>
              </div>
              <div className="bar-row">
                <span>
                  {fr
                    ? `Frais totaux\u00a0: ${pct(1 + nums[2])}`
                    : `Total fees: ${pct(1 + nums[2])}`}
                </span>
                <div
                  className="bar alt"
                  style={{
                    width: `${result.base ? (result.extra / result.base) * 100 : 0}%`,
                  }}
                />
                <strong>{money(result.extra)}</strong>
              </div>
            </div>
            <details>
              <summary>
                {fr
                  ? "Voir les données année par année"
                  : "View year-by-year data"}
              </summary>
              <table className="data-table">
                <caption>
                  {fr
                    ? "Soldes illustratifs en dollars canadiens"
                    : "Illustrative balances in Canadian dollars"}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{fr ? "Année" : "Year"}</th>
                    <th scope="col">{pct(1)}</th>
                    <th scope="col">{pct(1 + nums[2])}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.year}>
                      <th scope="row">{r.year}</th>
                      <td>{money(r.base)}</td>
                      <td>{money(r.extra)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
