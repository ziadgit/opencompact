import type { Category, Cell, Jurisdiction } from "@/lib/schemas";
import type { Rule } from "@/lib/rules/table";

const pass = (citation = "No specific rule found", why = "Not on the OpenCompact US/California list."): Cell => ({
  verdict: "PASS",
  citation,
  why,
});

const violation = (citation: string, why: string): Cell => ({
  verdict: "VIOLATION",
  citation,
  why,
});

const isLeaveOn = (c: Category) => c !== "rinse-off";
const isEye = (c: Category) => c === "eye-area";

const usCaPass = (): Pick<Record<Jurisdiction, Cell>, "US" | "CA"> => ({
  US: pass(),
  CA: pass(),
});

const euCite = (ref: string) => `Reg. (EC) 1223/2009 Annex V, entry ${ref}`;

const evalSimple = (ref: string, maxPpm: number, limitDesc: string) => {
  const citation = euCite(ref);
  return ({ ppm }: { ppm: number; category: Category }): Record<Jurisdiction, Cell> => ({
    ...usCaPass(),
    EU:
      ppm <= maxPpm
        ? pass(citation, `Permitted up to ${limitDesc} (${maxPpm} ppm); current level is ${ppm} ppm.`)
        : violation(citation, `Exceeds maximum concentration of ${limitDesc} (${maxPpm} ppm) under Annex V entry ${ref}.`),
  });
};

const evalRinseVsLeaveOn = (
  ref: string,
  rinseMaxPpm: number,
  rinseDesc: string,
  leaveMaxPpm: number,
  leaveDesc: string
) => {
  const citation = euCite(ref);
  return ({ ppm, category }: { ppm: number; category: Category }): Record<Jurisdiction, Cell> => {
    const leaveOn = isLeaveOn(category);
    const maxPpm = leaveOn ? leaveMaxPpm : rinseMaxPpm;
    const desc = leaveOn ? leaveDesc : rinseDesc;
    const typeLabel = leaveOn ? "leave-on" : "rinse-off";
    return {
      ...usCaPass(),
      EU:
        ppm <= maxPpm
          ? pass(citation, `Permitted in ${typeLabel} products up to ${desc} (${maxPpm} ppm).`)
          : violation(citation, `Exceeds ${typeLabel} maximum concentration of ${desc} (${maxPpm} ppm) under Annex V entry ${ref}.`),
    };
  };
};

const evalRinseOffOnly = (ref: string, maxPpm: number, limitDesc: string) => {
  const citation = euCite(ref);
  return ({ ppm, category }: { ppm: number; category: Category }): Record<Jurisdiction, Cell> => {
    if (isLeaveOn(category)) {
      return {
        ...usCaPass(),
        EU: violation(citation, `Only permitted in rinse-off products under Annex V entry ${ref}; not allowed in leave-on products.`),
      };
    }
    return {
      ...usCaPass(),
      EU:
        ppm <= maxPpm
          ? pass(citation, `Permitted in rinse-off products up to ${limitDesc} (${maxPpm} ppm).`)
          : violation(citation, `Exceeds rinse-off maximum concentration of ${limitDesc} (${maxPpm} ppm) under Annex V entry ${ref}.`),
    };
  };
};

const evalEyeOnly = (ref: string, maxPpm: number, limitDesc: string) => {
  const citation = euCite(ref);
  return ({ ppm, category }: { ppm: number; category: Category }): Record<Jurisdiction, Cell> => {
    if (!isEye(category)) {
      return {
        ...usCaPass(),
        EU: violation(citation, `Only permitted in eye products under Annex V entry ${ref}.`),
      };
    }
    return {
      ...usCaPass(),
      EU:
        ppm <= maxPpm
          ? pass(citation, `Permitted in eye products up to ${limitDesc} (${maxPpm} ppm).`)
          : violation(citation, `Exceeds eye product maximum concentration of ${limitDesc} (${maxPpm} ppm) under Annex V entry ${ref}.`),
    };
  };
};

export const EU_ANNEX_V_RULES: Rule[] = [
  {
    id: "eu-v-1",
    name: "Benzoic acid and its sodium salt",
    aliases: ["benzoic acid and its sodium salt", "benzoic acid", "sodium benzoate"],
    cas: "65-85-0",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits benzoic acid to 2.5% in rinse-off and 0.5% in leave-on products.",
    },
    evaluate: evalRinseVsLeaveOn("1", 25000, "2.5% (as acid)", 5000, "0.5% (as acid)"),
  },
  {
    id: "eu-v-1a",
    name: "Salts of benzoic acid other than that listed under reference number 1 and esters of benzoic acid",
    aliases: [
      "salts of benzoic acid other than that listed under reference number 1 and esters of benzoic acid",
      "ammonium benzoate",
      "calcium benzoate",
      "potassium benzoate",
      "magnesium benzoate",
      "mea-benzoate",
      "methyl benzoate",
      "ethyl benzoate",
      "propyl benzoate",
      "butyl benzoate",
      "isobutyl benzoate",
      "isopropyl benzoate",
      "phenyl benzoate",
    ],
    cas: "1863-63-4",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits other benzoate salts and esters to 0.5% (as acid).",
    },
    evaluate: evalSimple("1a", 5000, "0.5% (as acid)"),
  },
  {
    id: "eu-v-2",
    name: "Propionic acid and its salts",
    aliases: [
      "propionic acid and its salts",
      "propionic acid",
      "ammonium propionate",
      "calcium propionate",
      "magnesium propionate",
      "potassium propionate",
      "sodium propionate",
    ],
    cas: "79-09-4",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits propionic acid and its salts to 2% (as acid).",
    },
    evaluate: evalSimple("2", 20000, "2% (as acid)"),
  },
  {
    id: "eu-v-3",
    name: "Salicylic acid and its salts",
    aliases: [
      "salicylic acid and its salts",
      "salicylic acid",
      "calcium salicylate",
      "magnesium salicylate",
      "mea-salicylate",
      "sodium salicylate",
      "potassium salicylate",
      "tea-salicylate",
    ],
    cas: "69-72-7",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits salicylic acid and its salts as preservatives to 0.5% (as acid).",
    },
    evaluate: evalSimple("3", 5000, "0.5% (as acid)"),
  },
  {
    id: "eu-v-4",
    name: "Hexa-2,4-dienoic acid and its salts",
    aliases: [
      "hexa-2,4-dienoic acid and its salts",
      "sorbic acid",
      "calcium sorbate",
      "sodium sorbate",
      "potassium sorbate",
    ],
    cas: "110-44-1",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits sorbic acid and its salts to 0.6% (as acid).",
    },
    evaluate: evalSimple("4", 6000, "0.6% (as acid)"),
  },
  {
    id: "eu-v-7",
    name: "Biphenyl-2-ol",
    aliases: [
      "biphenyl-2-ol; 2-phenylphenol; 2-hydroxybiphenyl, sodium 2-biphenylate",
      "biphenyl-2-ol",
      "o-phenylphenol",
      "2-phenylphenol",
      "2-hydroxybiphenyl",
      "sodium 2-biphenylate",
      "sodium o-phenylphenate",
    ],
    cas: "90-43-7",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits biphenyl-2-ol to 0.2% in rinse-off and 0.15% in leave-on products (avoid contact with eyes).",
    },
    evaluate: ({ ppm, category }: { ppm: number; category: Category }): Record<Jurisdiction, Cell> => {
      const citation = euCite("7");
      if (isEye(category)) {
        return {
          ...usCaPass(),
          EU: violation(citation, "Annex V entry 7 requires avoiding contact with eyes; not permitted in eye-area products."),
        };
      }
      const leaveOn = isLeaveOn(category);
      const maxPpm = leaveOn ? 1500 : 2000;
      const desc = leaveOn ? "0.15% (as phenol)" : "0.2% (as phenol)";
      const typeLabel = leaveOn ? "leave-on" : "rinse-off";
      return {
        ...usCaPass(),
        EU:
          ppm <= maxPpm
            ? pass(citation, `Permitted in ${typeLabel} products up to ${desc} (${maxPpm} ppm).`)
            : violation(citation, `Exceeds ${typeLabel} maximum concentration of ${desc} (${maxPpm} ppm) under Annex V entry 7.`),
      };
    },
  },
  {
    id: "eu-v-9",
    name: "Inorganic sulphites and hydrogensulphites",
    aliases: [
      "inorganic sulphites and hydrogensulphites (5)",
      "inorganic sulphites and hydrogensulphites",
      "sodium sulfite",
      "ammonium bisulfite",
      "ammonium sulfite",
      "potassium sulfite",
      "potassium hydrogen sulfite",
      "sodium bisulfite",
      "sodium metabisulfite",
      "potassium metabisulfite",
    ],
    cas: "7757-83-7",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits inorganic sulphites and hydrogensulphites to 0.2% (as free SO2).",
    },
    evaluate: evalSimple("9", 2000, "0.2% (as free SO2)"),
  },
  {
    id: "eu-v-11",
    name: "Chlorobutanol",
    aliases: ["chlorobutanol", "1,1,1-trichloro-2-methyl-2-propanol"],
    cas: "57-15-8",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits chlorobutanol to 0.5%.",
    },
    evaluate: evalSimple("11", 5000, "0.5%"),
  },
  {
    id: "eu-v-12",
    name: "4-Hydroxybenzoic acid and its Methyl- and Ethyl-esters, and their salts",
    aliases: [
      "4-hydroxybenzoic acid and its methyl- and ethyl-esters, and their salts",
      "4-hydroxybenzoic acid",
      "methylparaben",
      "potassium ethylparaben",
      "potassium paraben",
      "sodium methylparaben",
      "sodium ethylparaben",
      "ethylparaben",
      "sodium paraben",
      "potassium methylparaben",
      "calcium paraben",
    ],
    cas: "99-96-7",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits single methyl/ethyl parabens to 0.4% (as acid) and mixtures to 0.8%.",
    },
    evaluate: evalSimple("12", 4000, "0.4% (as acid) for a single ester"),
  },
  {
    id: "eu-v-12 a",
    name: "Butyl 4-hydroxybenzoate and its salts Propyl 4-hydroxybenzoate and its salts",
    aliases: [
      "butyl 4-hydroxybenzoate and its salts propyl 4-hydroxybenzoate and its salts",
      "butylparaben",
      "propylparaben",
      "sodium propylparaben",
      "sodium butylparaben",
      "potassium butylparaben",
      "potassium propylparaben",
    ],
    cas: "94-26-8",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits butylparaben and propylparaben and their salts to 0.14% (as acid).",
    },
    evaluate: evalSimple("12 a", 1400, "0.14% (as acid)"),
  },
  {
    id: "eu-v-13",
    name: "3-Acetyl-6-methylpyran-2,4(3H)-dione and its salts",
    aliases: [
      "3-acetyl-6-methylpyran-2,4(3h)-dione and its salts",
      "dehydroacetic acid",
      "sodium dehydroacetate",
    ],
    cas: "520-45-6",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits dehydroacetic acid and its salts to 0.6% (as acid).",
    },
    evaluate: evalSimple("13", 6000, "0.6% (as acid)"),
  },
  {
    id: "eu-v-14",
    name: "Formic acid and its sodium salt",
    aliases: ["formic acid and its sodium salt", "formic acid", "sodium formate"],
    cas: "64-18-6",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits formic acid and its sodium salt to 0.5% (as acid).",
    },
    evaluate: evalSimple("14", 5000, "0.5% (as acid)"),
  },
  {
    id: "eu-v-15",
    name: "3,3'-Dibromo-4,4'-hexamethylenedioxydibenzamidine and its salts (including isethionate)",
    aliases: [
      "3,3'-dibromo-4,4'-hexamethylenedioxydibenzamidine and its salts (including isethionate)",
      "dibromohexamidine isethionate",
      "dibromohexamidine",
    ],
    cas: "93856-83-8",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits dibromohexamidine and its salts to 0.1%.",
    },
    evaluate: evalSimple("15", 1000, "0.1%"),
  },
  {
    id: "eu-v-16",
    name: "Thiomersal",
    aliases: ["thiomersal", "thimerosal"],
    cas: "54-64-8",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V restricts thiomersal to eye products up to 0.007% (of Hg).",
    },
    evaluate: evalEyeOnly("16", 70, "0.007% (of Hg)"),
  },
  {
    id: "eu-v-17",
    name: "Phenylmercuric salts (including borate)",
    aliases: [
      "phenylmercuric salts (including borate)",
      "phenylmercuric acetate",
      "phenylmercuric benzoate",
      "phenylmercuric borate",
    ],
    cas: "62-38-4",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V restricts phenylmercuric salts to eye products up to 0.007% (of Hg).",
    },
    evaluate: evalEyeOnly("17", 70, "0.007% (of Hg)"),
  },
  {
    id: "eu-v-18",
    name: "Undec-10-enoic acid and its salts",
    aliases: [
      "undec-10-enoic acid and its salts",
      "undecylenic acid",
      "potassium undecylenate",
      "sodium undecylenate",
      "calcium undecylenate",
      "tea-undecylenate",
      "mea-undecylenate",
    ],
    cas: "112-38-9",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits undecylenic acid and its salts to 0.2% (as acid).",
    },
    evaluate: evalSimple("18", 2000, "0.2% (as acid)"),
  },
  {
    id: "eu-v-19",
    name: "5-Pyrimidinamine, 1,3-bis(2-ethylhexyl)hexahydro-5-methyl-",
    aliases: [
      "5-pyrimidinamine, 1,3-bis(2-ethylhexyl)hexahydro-5-methyl-",
      "hexetidine",
    ],
    cas: "141-94-6",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits hexetidine to 0.1%.",
    },
    evaluate: evalSimple("19", 1000, "0.1%"),
  },
  {
    id: "eu-v-20",
    name: "5-Bromo-5-nitro-1,3-dioxane",
    aliases: ["5-bromo-5-nitro-1,3-dioxane"],
    cas: "30007-47-7",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V restricts 5-bromo-5-nitro-1,3-dioxane to rinse-off products up to 0.1%.",
    },
    evaluate: evalRinseOffOnly("20", 1000, "0.1%"),
  },
  {
    id: "eu-v-21",
    name: "Bronopol",
    aliases: ["bronopol", "2-bromo-2-nitropropane-1,3-diol"],
    cas: "52-51-7",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits bronopol to 0.1%.",
    },
    evaluate: evalSimple("21", 1000, "0.1%"),
  },
  {
    id: "eu-v-22",
    name: "2,4-Dichlorobenzyl alcohol",
    aliases: ["2,4-dichlorobenzyl alcohol", "dichlorobenzyl alcohol"],
    cas: "1777-82-8",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits 2,4-dichlorobenzyl alcohol to 0.15%.",
    },
    evaluate: evalSimple("22", 1500, "0.15%"),
  },
  {
    id: "eu-v-23",
    name: "1-(4-Chlorophenyl)-3-(3,4-dichlorophenyl)urea",
    aliases: [
      "1-(4-chlorophenyl)-3-(3,4-dichlorophenyl)urea",
      "triclocarban",
    ],
    cas: "101-20-2",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits triclocarban as a preservative to 0.2%.",
    },
    evaluate: evalSimple("23", 2000, "0.2%"),
  },
  {
    id: "eu-v-24",
    name: "Chlorocresol",
    aliases: ["chlorocresol", "p-chloro-m-cresol"],
    cas: "59-50-7",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits chlorocresol to 0.2% and prohibits use on mucous membranes.",
    },
    evaluate: ({ ppm, category }: { ppm: number; category: Category }): Record<Jurisdiction, Cell> => {
      const citation = euCite("24");
      if (category === "lip" || isEye(category)) {
        return {
          ...usCaPass(),
          EU: violation(citation, "Not to be used in products applied on mucous membranes under Annex V entry 24."),
        };
      }
      return {
        ...usCaPass(),
        EU:
          ppm <= 2000
            ? pass(citation, `Permitted up to 0.2% (2000 ppm) in products not applied to mucous membranes.`)
            : violation(citation, `Exceeds maximum concentration of 0.2% (2000 ppm) under Annex V entry 24.`),
      };
    },
  },
  {
    id: "eu-v-25",
    name: "5-Chloro-2-(2,4-dichlorophenoxy)phenol",
    aliases: ["5-chloro-2-(2,4-dichlorophenoxy)phenol", "triclosan"],
    cas: "3380-34-5",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits triclosan to 0.3% in specific product types (soaps, shower gels, non-spray deodorants, face powders).",
    },
    evaluate: ({ ppm, category }: { ppm: number; category: Category }): Record<Jurisdiction, Cell> => {
      const citation = euCite("25");
      if (category === "lip" || isEye(category)) {
        return {
          ...usCaPass(),
          EU: violation(citation, "Triclosan is not permitted in lip or eye-area products under Annex V entry 25."),
        };
      }
      return {
        ...usCaPass(),
        EU:
          ppm <= 3000
            ? pass(citation, `Permitted up to 0.3% (3000 ppm) in eligible product types under Annex V entry 25.`)
            : violation(citation, `Exceeds maximum concentration of 0.3% (3000 ppm) under Annex V entry 25.`),
      };
    },
  },
  {
    id: "eu-v-26",
    name: "Chloroxylenol",
    aliases: ["chloroxylenol", "phenol, 4-chloro-3,5-dimethyl-", "4-chloro-3,5-xylenol"],
    cas: "88-04-0",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits chloroxylenol to 0.5%.",
    },
    evaluate: evalSimple("26", 5000, "0.5%"),
  },
  {
    id: "eu-v-27",
    name: "N,N''-Methylenebis[N'-[3-(hydroxymethyl)-2,5-dioxoimidazolidin-4-yl]urea]",
    aliases: [
      "n,n''-methylenebis[n'-[3-(hydroxymethyl)-2,5-dioxoimidazolidin-4-yl]urea]",
      "imidazolidinyl urea",
    ],
    cas: "39236-46-9",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits imidazolidinyl urea to 0.6%.",
    },
    evaluate: evalSimple("27", 6000, "0.6%"),
  },
  {
    id: "eu-v-28",
    name: "Polyhexamethylene biguanide hydrochloride",
    aliases: [
      "polyhexamethylene biguanide hydrochloride",
      "polyaminopropyl biguanide",
      "phmb",
    ],
    cas: "32289-58-0",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits polyaminopropyl biguanide to 0.1%.",
    },
    evaluate: evalSimple("28", 1000, "0.1%"),
  },
  {
    id: "eu-v-29",
    name: "2-Phenoxyethanol",
    aliases: ["2-phenoxyethanol", "phenoxyethanol"],
    cas: "122-99-6",
    swap: {
      to: "Sodium Benzoate",
      reason: "Annex V limits 2-phenoxyethanol to 1.0%; swap to Sodium Benzoate if over limit.",
    },
    evaluate: evalSimple("29", 10000, "1.0%"),
  },
  {
    id: "eu-v-30",
    name: "Methenamine",
    aliases: ["methenamine", "1,3,5,7-tetraazatricyclo[3.3.1.1(3,7)]decane", "hexamethylenetetramine"],
    cas: "100-97-0",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits methenamine to 0.15%.",
    },
    evaluate: evalSimple("30", 1500, "0.15%"),
  },
  {
    id: "eu-v-32",
    name: "1-(4-Chlorophenoxy)-1-(imidazol-1-yl)-3,3-dimethylbutan-2-one",
    aliases: [
      "1-(4-chlorophenoxy)-1-(imidazol-1-yl)-3,3-dimethylbutan-2-one",
      "(r,s)-1-(4-chlorophenoxy)-1-imidazol-1-yl-3,3-dimethylbutan-2-one",
      "climbazole",
    ],
    cas: "38083-17-9",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits climbazole to 0.5% in rinse-off shampoo and 0.2% in leave-on hair/face/foot products.",
    },
    evaluate: evalRinseVsLeaveOn("32", 5000, "0.5%", 2000, "0.2%"),
  },
  {
    id: "eu-v-33",
    name: "1,3-Bis(hydroxymethyl)-5,5-dimethylimidazolidine-2,4-dione",
    aliases: [
      "1,3-bis(hydroxymethyl)-5,5-dimethylimidazolidine-2,4-dione",
      "dmdm hydantoin",
    ],
    cas: "6440-58-0",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits DMDM hydantoin to 0.6%.",
    },
    evaluate: evalSimple("33", 6000, "0.6%"),
  },
  {
    id: "eu-v-34",
    name: "Benzyl alcohol",
    aliases: ["benzyl alcohol (7)", "benzyl alcohol"],
    cas: "100-51-6",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits benzyl alcohol as a preservative to 1.0%.",
    },
    evaluate: evalSimple("34", 10000, "1.0%"),
  },
  {
    id: "eu-v-35",
    name: "1-Hydroxy-4-methyl-6-(2,4,4-trimethylpentyl)-2 pyridon and its monoethanolamine salt",
    aliases: [
      "1-hydroxy-4-methyl-6-(2,4,4-trimethylpentyl)-2 pyridon and its monoethanolamine salt",
      "piroctone olamine",
      "octopirox",
    ],
    cas: "50650-76-5",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits piroctone olamine to 1.0% in rinse-off and 0.5% in other products.",
    },
    evaluate: evalRinseVsLeaveOn("35", 10000, "1.0%", 5000, "0.5%"),
  },
  {
    id: "eu-v-37",
    name: "2,2'-Methylenebis(6-bromo-4-chlorophenol)",
    aliases: [
      "2,2'-methylenebis(6-bromo-4-chlorophenol)",
      "6,6-dibromo-4,4-dichloro-2,2'-methylene-diphenol",
      "bromochlorophene",
    ],
    cas: "15435-29-7",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits bromochlorophene to 0.1%.",
    },
    evaluate: evalSimple("37", 1000, "0.1%"),
  },
  {
    id: "eu-v-38",
    name: "4-Isopropyl-m-cresol",
    aliases: ["4-isopropyl-m-cresol", "o-cymen-5-ol", "isopropylmethylphenol"],
    cas: "3228-02-2",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits o-cymen-5-ol to 0.1%.",
    },
    evaluate: evalSimple("38", 1000, "0.1%"),
  },
  {
    id: "eu-v-39",
    name: "Mixture of 5-Chloro-2-methyl-isothiazol-3(2H)-one and 2-Methylisothiazol-3(2H)-one with magnesium chloride and magnesium nitrate",
    aliases: [
      "mixture of 5-chloro-2-methyl-isothiazol-3(2h)-one and 2-methylisothiazol-3(2h)-one with magnesium chloride and magnesium nitrate",
      "methylchloroisothiazolinone and methylisothiazolinone",
      "methylchloroisothiazolinone",
      "cmit/mit",
    ],
    cas: "26172-55-4",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V restricts CMIT/MIT mixture to rinse-off products up to 0.0015% (15 ppm).",
    },
    evaluate: evalRinseOffOnly("39", 15, "0.0015%"),
  },
  {
    id: "eu-v-42",
    name: "N,N'-bis(4-chlorophenyl)-3,12-diimino-2,4,11,13-tetraazatetradecanediamidine and its digluconate, diacetate and dihydrochloride",
    aliases: [
      "n,n'-bis(4-chlorophenyl)-3,12-diimino-2,4,11,13-tetraazatetradecanediamidine and its digluconate, diacetate and dihydrochloride",
      "chlorhexidine",
      "chlorhexidine diacetate",
      "chlorhexidine digluconate",
      "chlorhexidine dihydrochloride",
    ],
    cas: "55-56-1",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits chlorhexidine and its salts to 0.3% (as chlorhexidine).",
    },
    evaluate: evalSimple("42", 3000, "0.3% (as chlorhexidine)"),
  },
  {
    id: "eu-v-43",
    name: "1-Phenoxypropan-2-ol",
    aliases: ["1-phenoxypropan-2-ol (8)", "1-phenoxypropan-2-ol", "phenoxyisopropanol"],
    cas: "770-35-4",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V restricts 1-phenoxypropan-2-ol to rinse-off products up to 1.0%.",
    },
    evaluate: evalRinseOffOnly("43", 10000, "1.0%"),
  },
  {
    id: "eu-v-44",
    name: "Alkyl (C12-C22) trimethyl ammonium bromide and chloride",
    aliases: [
      "alkyl (c12-c22) trimethyl ammonium bromide and chloride",
      "behentrimonium chloride",
      "cetrimonium bromide",
      "cetrimonium chloride",
      "laurtrimonium bromide",
      "laurtrimonium chloride",
      "steartrimonium bromide",
      "steartrimonium chloride",
    ],
    cas: "17301-53-0",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits alkyl (C12-C22) trimethyl ammonium bromide and chloride as preservatives to 0.1%.",
    },
    evaluate: evalSimple("44", 1000, "0.1%"),
  },
  {
    id: "eu-v-45",
    name: "4,4-Dimethyl-1,3-oxazolidine",
    aliases: ["4,4-dimethyl-1,3-oxazolidine", "dimethyl oxazolidine"],
    cas: "51200-87-4",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits 4,4-dimethyl-1,3-oxazolidine to 0.1%.",
    },
    evaluate: evalSimple("45", 1000, "0.1%"),
  },
  {
    id: "eu-v-46",
    name: "N-(Hydroxymethyl)-N-(dihydroxymethyl-1,3-dioxo-2,5-imidazolidinyl-4)-N'-(hydroxymethyl)urea",
    aliases: [
      "n-(hydroxymethyl)-n-(dihydroxymethyl-1,3-dioxo-2,5-imidazolidinyl-4)-n'-(hydroxymethyl)urea",
      "diazolidinyl urea",
    ],
    cas: "78491-02-8",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits diazolidinyl urea to 0.5%.",
    },
    evaluate: evalSimple("46", 5000, "0.5%"),
  },
  {
    id: "eu-v-47",
    name: "Benzenecarboximidamide, 4,4'-(1,6-hexanediylbis(oxy))bis-, and its salts (including isothionate and p-hydroxybenzoate)",
    aliases: [
      "benzenecarboximidamide, 4,4'-(1,6-hexanediylbis(oxy))bis-, and its salts (including isothionate and p-hydroxybenzoate)",
      "hexamidine",
      "hexamidine diisethionate",
      "hexamidine paraben",
      "hexamidine diparaben",
    ],
    cas: "3811-75-4",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits hexamidine and its salts to 0.1%.",
    },
    evaluate: evalSimple("47", 1000, "0.1%"),
  },
  {
    id: "eu-v-48",
    name: "Glutaraldehyde (Pentane-1,5-dial)",
    aliases: ["glutaraldehyde (pentane-1,5-dial)", "glutaraldehyde", "glutaral", "pentane-1,5-dial"],
    cas: "111-30-8",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits glutaral to 0.1%.",
    },
    evaluate: evalSimple("48", 1000, "0.1%"),
  },
  {
    id: "eu-v-49",
    name: "5-Ethyl-3,7-dioxa-1-azabicyclo[3.3.0] octane",
    aliases: ["5-ethyl-3,7-dioxa-1-azabicyclo[3.3.0] octane", "7-ethylbicyclooxazolidine"],
    cas: "7747-35-5",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits 7-ethylbicyclooxazolidine to 0.3%.",
    },
    evaluate: evalSimple("49", 3000, "0.3%"),
  },
  {
    id: "eu-v-50",
    name: "3-(p-Chlorophenoxy)-propane-1,2-diol",
    aliases: ["3-(p-chlorophenoxy)-propane-1,2-diol", "chlorphenesin"],
    cas: "104-29-0",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits chlorphenesin to 0.3%.",
    },
    evaluate: evalSimple("50", 3000, "0.3%"),
  },
  {
    id: "eu-v-51",
    name: "Sodium hydroxymethylamino acetate",
    aliases: [
      "sodium hydroxymethylamino acetate",
      "sodium n-(hydroxymethyl)glycinate /sodium hydroxymethylamino acetate",
      "sodium hydroxymethylglycinate",
    ],
    cas: "70161-44-3",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits sodium hydroxymethylglycinate to 0.5%.",
    },
    evaluate: evalSimple("51", 5000, "0.5%"),
  },
  {
    id: "eu-v-52",
    name: "Silver chloride deposited on titanium dioxide",
    aliases: ["silver chloride deposited on titanium dioxide", "silver chloride"],
    cas: "7783-90-6",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits silver chloride deposited on titanium dioxide to 0.004% (as AgCl).",
    },
    evaluate: evalSimple("52", 40, "0.004% (as AgCl)"),
  },
  {
    id: "eu-v-53",
    name: "Benzenemethanaminium, N,N-dimethyl-N-[2-[2-[4-(1,1,3,3,-tetramethylbutyl)phenoxy]ethoxy]ethyl]-, chloride",
    aliases: [
      "benzenemethanaminium, n,n-dimethyl-n-[2-[2-[4-(1,1,3,3,-tetramethylbutyl)phenoxy]ethoxy]ethyl]-, chloride",
      "benzethonium chloride",
    ],
    cas: "121-54-0",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits benzethonium chloride to 0.1% in rinse-off and non-oral leave-on products.",
    },
    evaluate: ({ ppm, category }: { ppm: number; category: Category }): Record<Jurisdiction, Cell> => {
      const citation = euCite("53");
      if (category === "lip") {
        return {
          ...usCaPass(),
          EU: violation(citation, "Not permitted in oral/lip leave-on products under Annex V entry 53."),
        };
      }
      return {
        ...usCaPass(),
        EU:
          ppm <= 1000
            ? pass(citation, `Permitted up to 0.1% (1000 ppm) in rinse-off and non-oral leave-on products.`)
            : violation(citation, `Exceeds maximum concentration of 0.1% (1000 ppm) under Annex V entry 53.`),
      };
    },
  },
  {
    id: "eu-v-54",
    name: "Benzalkonium chloride, bromide and saccharinate",
    aliases: [
      "benzalkonium chloride, bromide and saccharinate (10)",
      "benzalkonium chloride, bromide and saccharinate",
      "benzalkonium chloride",
      "benzalkonium bromide",
      "benzalkonium saccharinate",
    ],
    cas: "8001-54-5",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits benzalkonium chloride, bromide and saccharinate to 0.1% (as benzalkonium chloride).",
    },
    evaluate: ({ ppm, category }: { ppm: number; category: Category }): Record<Jurisdiction, Cell> => {
      const citation = euCite("54");
      if (isEye(category)) {
        return {
          ...usCaPass(),
          EU: violation(citation, "Annex V entry 54 requires avoiding contact with eyes; not permitted in eye-area products."),
        };
      }
      return {
        ...usCaPass(),
        EU:
          ppm <= 1000
            ? pass(citation, `Permitted up to 0.1% (as benzalkonium chloride) (1000 ppm).`)
            : violation(citation, `Exceeds maximum concentration of 0.1% (as benzalkonium chloride) (1000 ppm) under Annex V entry 54.`),
      };
    },
  },
  {
    id: "eu-v-55",
    name: "Methanol, (phenylmethoxy)-",
    aliases: [
      "methanol, (phenylmethoxy)-",
      "benzyloxymethanol; benzyl hydroxyoxymethan",
      "benzylhemiformal",
    ],
    cas: "14548-60-8",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V restricts benzylhemiformal to rinse-off products up to 0.15%.",
    },
    evaluate: evalRinseOffOnly("55", 1500, "0.15%"),
  },
  {
    id: "eu-v-56",
    name: "3-Iodo-2-propynylbutylcarbamate",
    aliases: [
      "3-iodo-2-propynylbutylcarbamate",
      "iodopropynyl butylcarbamate",
      "ipbc",
    ],
    cas: "55406-53-6",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits iodopropynyl butylcarbamate to 0.02% in rinse-off and 0.01% in leave-on products.",
    },
    evaluate: evalRinseVsLeaveOn("56", 200, "0.02%", 100, "0.01%"),
  },
  {
    id: "eu-v-57",
    name: "2-Methyl-2H-isothiazol-3-one",
    aliases: ["2-methyl-2h-isothiazol-3-one", "methylisothiazolinone", "mit"],
    cas: "2682-20-4",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V restricts methylisothiazolinone to rinse-off products up to 0.0015% (15 ppm).",
    },
    evaluate: evalRinseOffOnly("57", 15, "0.0015%"),
  },
  {
    id: "eu-v-58",
    name: "Ethyl-N-alpha-dodecanoyl-L-arginate hydrochloride",
    aliases: [
      "ethyl-n-alpha-dodecanoyl-l-arginate hydrochloride",
      "ethyl lauroyl arginate hcl",
    ],
    cas: "60372-77-2",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits ethyl lauroyl arginate HCl to 0.4% in general cosmetic products (0.15% in mouthwashes).",
    },
    evaluate: evalSimple("58", 4000, "0.4%"),
  },
  {
    id: "eu-v-59",
    name: "1,2,3-Propanetricarboxylic acid, 2-hydroxy-, monohydrate and 1,2,3-Propanetricarboxylic acid, 2-hydroxy-silver(1+) salt, monohydrate",
    aliases: [
      "1,2,3-propanetricarboxylic acid, 2-hydroxy-, monohydrate and 1,2,3-propanetricarboxylic acid, 2-hydroxy-silver(1+) salt, monohydrate",
      "citric acid and silver citrate",
      "silver citrate",
    ],
    cas: "5949-29-1",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits citric acid and silver citrate mixture to 0.2% (corresponding to 0.0024% of silver).",
    },
    evaluate: evalSimple("59", 2000, "0.2% (corresponding to 0.0024% of silver)"),
  },
  {
    id: "eu-v-60",
    name: "4-(3-ethoxy-4-hydroxyphenyl)butan-2-one",
    aliases: [
      "4-(3-ethoxy-4-hydroxyphenyl)butan-2-one",
      "hydroxyethoxyphenyl butanone",
    ],
    cas: "569646-79-3",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V limits hydroxyethoxyphenyl butanone to 0.7%.",
    },
    evaluate: evalSimple("60", 7000, "0.7%"),
  },
  {
    id: "eu-v-61",
    name: "Silver zinc zeolite",
    aliases: ["silver zinc zeolite", "ammonium silver zinc aluminum silicate"],
    cas: "130328-20-0",
    swap: {
      to: "Reduce to the Annex V limit or use Phenoxyethanol",
      reason: "Annex V restricts silver zinc zeolite to deodorant sprays and powder foundations up to 1%.",
    },
    evaluate: ({ ppm, category }: { ppm: number; category: Category }): Record<Jurisdiction, Cell> => {
      const citation = euCite("61");
      if (!isLeaveOn(category) || category === "lip" || isEye(category)) {
        return {
          ...usCaPass(),
          EU: violation(citation, "Only permitted in deodorant sprays and powder foundations under Annex V entry 61."),
        };
      }
      return {
        ...usCaPass(),
        EU:
          ppm <= 10000
            ? pass(citation, `Permitted in deodorant sprays and powder foundations up to 1% (10000 ppm).`)
            : violation(citation, `Exceeds maximum concentration of 1% (10000 ppm) under Annex V entry 61.`),
      };
    },
  },
];

