import type { Category, Cell, Jurisdiction } from "@/lib/schemas";
import type { Rule } from "@/lib/rules/table";

const pass = (citation = "No restriction triggered", why = "Permitted at this level for this product type."): Cell => ({
  verdict: "PASS",
  citation,
  why,
});
const violation = (citation: string, why: string): Cell => ({ verdict: "VIOLATION", citation, why });

const isEye = (c: Category) => c === "eye-area";
const isLeaveOn = (c: Category) => c !== "rinse-off";

type Lim = { ppm: number; text: string } | null;

const P = (pct: number) => Math.round(pct * 10_000);
const lim = (pct: number, text?: string): Lim => ({ ppm: P(pct), text: text ?? `${pct}%` });

const DEFAULT_SWAP: Rule["swap"] = {
  to: "Reduce to the Annex V limit or use Phenoxyethanol",
  reason: "Phenoxyethanol is an Annex V preservative permitted up to 1.0%, a common compliant replacement.",
};

const notListed = (): Cell => pass("No specific rule found", "Not on the OpenCompact US/California list.");

function euCell(ref: string, limit: Lim, ppm: number): Cell {
  const citation = `Reg. (EC) 1223/2009 Annex V, entry ${ref}`;
  if (limit === null) {
    return violation(citation, "This product type is not a permitted use for this preservative under Annex V.");
  }
  if (ppm <= limit.ppm) {
    return pass(citation, `Permitted: the Annex V limit for this product type is ${limit.text}.`);
  }
  return violation(citation, `Exceeds the Annex V limit of ${limit.text} for this product type.`);
}

type Opts = {
  ref: string;
  name: string;
  aliases: string[];
  cas: string;
  rinse: Lim;
  leave: Lim;
  eye?: Lim;
  swap?: Rule["swap"];
};

function euRule(o: Opts): Rule {
  return {
    id: `eu-v-${o.ref}`,
    name: o.name,
    aliases: o.aliases,
    cas: o.cas,
    swap: o.swap ?? DEFAULT_SWAP,
    evaluate: ({ ppm, category }) => {
      const limit = !isLeaveOn(category)
        ? o.rinse
        : isEye(category) && o.eye !== undefined
          ? o.eye
          : o.leave;
      const eu: Cell = euCell(o.ref, limit, ppm);
      return {
        US: notListed(),
        CA: notListed(),
        EU: eu,
      } as Record<Jurisdiction, Cell>;
    },
  };
}

export const EU_ANNEX_V_RULES: Rule[] = [
  euRule({
    ref: "1",
    name: "Benzoic acid and its sodium salt",
    aliases: ["benzoic acid and its sodium salt", "benzoic acid", "sodium benzoate"],
    cas: "65-85-0",
    rinse: lim(2.5, "2.5% (as acid)"),
    leave: lim(0.5, "0.5% (as acid)"),
  }),
  euRule({
    ref: "1a",
    name: "Salts of benzoic acid other than that listed under reference number 1 and esters of benzoic acid",
    aliases: ["salts of benzoic acid", "esters of benzoic acid", "potassium benzoate", "calcium benzoate", "benzyl benzoate"],
    cas: "1863-63-4",
    rinse: lim(0.5, "0.5% (as acid)"),
    leave: lim(0.5, "0.5% (as acid)"),
  }),
  euRule({
    ref: "2",
    name: "Propionic acid and its salts",
    aliases: ["propionic acid", "sodium propionate", "calcium propionate"],
    cas: "79-09-4",
    rinse: lim(2, "2% (as acid)"),
    leave: lim(2, "2% (as acid)"),
  }),
  euRule({
    ref: "3",
    name: "Salicylic acid and its salts",
    aliases: ["salicylic acid and its salts", "salicylic acid", "sodium salicylate", "potassium salicylate"],
    cas: "69-72-7",
    rinse: lim(0.5, "0.5% (as acid)"),
    leave: lim(0.5, "0.5% (as acid)"),
  }),
  euRule({
    ref: "4",
    name: "Hexa-2,4-dienoic acid and its salts",
    aliases: ["hexa-2,4-dienoic acid and its salts", "sorbic acid", "potassium sorbate", "sodium sorbate", "calcium sorbate"],
    cas: "110-44-1",
    rinse: lim(0.6, "0.6% (as acid)"),
    leave: lim(0.6, "0.6% (as acid)"),
  }),
  euRule({
    ref: "7",
    name: "Biphenyl-2-ol",
    aliases: ["biphenyl-2-ol", "2-phenylphenol", "2-hydroxybiphenyl", "sodium 2-biphenylate", "sodium phenylphenate"],
    cas: "90-43-7",
    rinse: lim(0.2, "0.2% (as phenol)"),
    leave: lim(0.15, "0.15% (as phenol)"),
  }),
  euRule({
    ref: "9",
    name: "Inorganic sulphites and hydrogensulphites",
    aliases: ["inorganic sulphites and hydrogensulphites", "sodium sulfite", "sodium bisulfite", "potassium bisulfite"],
    cas: "7757-83-7",
    rinse: lim(0.2, "0.2% (as free SO2)"),
    leave: lim(0.2, "0.2% (as free SO2)"),
  }),
  euRule({
    ref: "11",
    name: "1,1,1-Trichloro-2-methyl-2-propanol",
    aliases: ["chlorobutanol", "1,1,1-trichloro-2-methyl-2-propanol"],
    cas: "57-15-8",
    rinse: lim(0.5),
    leave: lim(0.5),
  }),
  euRule({
    ref: "12",
    name: "4-Hydroxybenzoic acid and its Methyl- and Ethyl-esters, and their salts",
    aliases: [
      "4-hydroxybenzoic acid and its methyl- and ethyl-esters, and their salts",
      "methylparaben",
      "ethylparaben",
      "sodium methylparaben",
      "sodium ethylparaben",
      "potassium paraben",
      "sodium paraben",
      "calcium paraben",
      "potassium methylparaben",
    ],
    cas: "99-96-7",
    rinse: lim(0.4, "0.4% (as acid) for a single ester"),
    leave: lim(0.4, "0.4% (as acid) for a single ester"),
  }),
  euRule({
    ref: "12 a",
    name: "Butyl 4-hydroxybenzoate and its salts; Propyl 4-hydroxybenzoate and its salts",
    aliases: [
      "butyl 4-hydroxybenzoate and its salts",
      "propyl 4-hydroxybenzoate and its salts",
      "butylparaben",
      "propylparaben",
      "sodium propylparaben",
      "sodium butylparaben",
      "potassium butylparaben",
      "potassium propylparaben",
    ],
    cas: "94-26-8",
    rinse: lim(0.14, "0.14% (as acid) for the sum of butylparaben and propylparaben"),
    leave: lim(0.14, "0.14% (as acid) for the sum of butylparaben and propylparaben"),
  }),
  euRule({
    ref: "13",
    name: "3-Acetyl-6-methylpyran-2,4(3H)-dione and its salts",
    aliases: ["3-acetyl-6-methylpyran-2,4(3h)-dione and its salts", "dehydroacetic acid", "sodium dehydroacetate"],
    cas: "520-45-6",
    rinse: lim(0.6, "0.6% (as acid)"),
    leave: lim(0.6, "0.6% (as acid)"),
  }),
  euRule({
    ref: "14",
    name: "Formic acid and its sodium salt",
    aliases: ["formic acid and its sodium salt", "formic acid", "sodium formate"],
    cas: "64-18-6",
    rinse: lim(0.5, "0.5% (as acid)"),
    leave: lim(0.5, "0.5% (as acid)"),
  }),
  euRule({
    ref: "15",
    name: "3,3'-Dibromo-4,4'-hexamethylenedioxydibenzamidine and its salts",
    aliases: ["dibromohexamidine", "dibromohexamidine isethionate"],
    cas: "93856-83-8",
    rinse: lim(0.1),
    leave: lim(0.1),
  }),
  euRule({
    ref: "16",
    name: "Thiomersal",
    aliases: ["thiomersal", "thimerosal"],
    cas: "54-64-8",
    rinse: null,
    leave: null,
    eye: lim(0.007, "0.007% (of Hg) in eye products"),
  }),
  euRule({
    ref: "17",
    name: "Phenylmercuric salts",
    aliases: ["phenylmercuric salts", "phenylmercuric acetate", "phenylmercuric borate", "phenylmercuric nitrate"],
    cas: "62-38-4",
    rinse: null,
    leave: null,
    eye: lim(0.007, "0.007% (of Hg) in eye products"),
  }),
  euRule({
    ref: "18",
    name: "Undec-10-enoic acid and its salts",
    aliases: ["undec-10-enoic acid and its salts", "undecylenic acid", "sodium undecylenate", "zinc undecylenate"],
    cas: "112-38-9",
    rinse: lim(0.2, "0.2% (as acid)"),
    leave: lim(0.2, "0.2% (as acid)"),
  }),
  euRule({
    ref: "19",
    name: "5-Pyrimidinamine, 1,3-bis(2-ethylhexyl)hexahydro-5-methyl-",
    aliases: ["5-pyrimidinamine, 1,3-bis(2-ethylhexyl)hexahydro-5-methyl-", "hexetidine"],
    cas: "141-94-6",
    rinse: lim(0.1),
    leave: lim(0.1),
  }),
  euRule({
    ref: "20",
    name: "5-Bromo-5-nitro-1,3-dioxane",
    aliases: ["5-bromo-5-nitro-1,3-dioxane", "bronidox"],
    cas: "30007-47-7",
    rinse: lim(0.1),
    leave: null,
  }),
  euRule({
    ref: "21",
    name: "Bronopol",
    aliases: ["bronopol", "2-bromo-2-nitropropane-1,3-diol"],
    cas: "52-51-7",
    rinse: lim(0.1),
    leave: lim(0.1),
  }),
  euRule({
    ref: "22",
    name: "2,4-Dichlorobenzyl alcohol",
    aliases: ["2,4-dichlorobenzyl alcohol", "dichlorobenzyl alcohol"],
    cas: "1777-82-8",
    rinse: lim(0.15),
    leave: lim(0.15),
  }),
  euRule({
    ref: "23",
    name: "1-(4-Chlorophenyl)-3-(3,4-dichlorophenyl)urea",
    aliases: ["1-(4-chlorophenyl)-3-(3,4-dichlorophenyl)urea", "triclocarban"],
    cas: "101-20-2",
    rinse: lim(0.2),
    leave: lim(0.2),
  }),
  euRule({
    ref: "24",
    name: "Chlorocresol",
    aliases: ["chlorocresol", "4-chloro-3-methylphenol", "para-chloro-meta-cresol"],
    cas: "59-50-7",
    rinse: lim(0.2),
    leave: lim(0.2),
  }),
  euRule({
    ref: "25",
    name: "5-Chloro-2-(2,4-dichlorophenoxy)phenol",
    aliases: ["5-chloro-2-(2,4-dichlorophenoxy)phenol", "triclosan"],
    cas: "3380-34-5",
    rinse: lim(0.3),
    leave: null,
  }),
  euRule({
    ref: "26",
    name: "Chloroxylenol",
    aliases: ["chloroxylenol", "pcmx", "4-chloro-3,5-dimethylphenol"],
    cas: "88-04-0",
    rinse: lim(0.5),
    leave: lim(0.5),
  }),
  euRule({
    ref: "27",
    name: "Imidazolidinyl urea",
    aliases: [
      "n,n''-methylenebis[n'-[3-(hydroxymethyl)-2,5-dioxoimidazolidin-4-yl]urea]",
      "imidazolidinyl urea",
    ],
    cas: "39236-46-9",
    rinse: lim(0.6),
    leave: lim(0.6),
  }),
  euRule({
    ref: "28",
    name: "Polyhexamethylene biguanide hydrochloride",
    aliases: ["polyhexamethylene biguanide hydrochloride", "polyhexamethylene biguanide", "phmb"],
    cas: "32289-58-0",
    rinse: lim(0.1),
    leave: lim(0.1),
  }),
  euRule({
    ref: "29",
    name: "2-Phenoxyethanol",
    aliases: ["2-phenoxyethanol", "phenoxyethanol", "ethylene glycol monophenyl ether"],
    cas: "122-99-6",
    rinse: lim(1.0),
    leave: lim(1.0),
    swap: {
      to: "Sodium Benzoate",
      reason: "Sodium benzoate is an Annex V preservative and avoids the phenoxyethanol concentration cap.",
    },
  }),
  euRule({
    ref: "30",
    name: "Methenamine",
    aliases: ["methenamine", "hexamethylenetetramine", "1,3,5,7-tetraazatricyclo[3.3.1.1(3,7)]decane"],
    cas: "100-97-0",
    rinse: lim(0.15),
    leave: lim(0.15),
  }),
  euRule({
    ref: "32",
    name: "1-(4-Chlorophenoxy)-1-(imidazol-1-yl)-3,3-dimethylbutan-2-one",
    aliases: ["climbazole", "1-(4-chlorophenoxy)-1-(imidazol-1-yl)-3,3-dimethylbutan-2-one"],
    cas: "38083-17-9",
    rinse: lim(0.5),
    leave: lim(0.2),
  }),
  euRule({
    ref: "33",
    name: "1,3-Bis(hydroxymethyl)-5,5-dimethylimidazolidine-2,4-dione",
    aliases: ["dmdm hydantoin", "1,3-bis(hydroxymethyl)-5,5-dimethylimidazolidine-2,4-dione"],
    cas: "6440-58-0",
    rinse: lim(0.6),
    leave: lim(0.6),
  }),
  euRule({
    ref: "34",
    name: "Benzyl alcohol",
    aliases: ["benzyl alcohol"],
    cas: "100-51-6",
    rinse: lim(1.0),
    leave: lim(1.0),
  }),
  euRule({
    ref: "35",
    name: "1-Hydroxy-4-methyl-6-(2,4,4-trimethylpentyl)-2-pyridon and its monoethanolamine salt",
    aliases: ["ciclopirox", "ciclopirox olamine", "1-hydroxy-4-methyl-6-(2,4,4-trimethylpentyl)-2-pyridon"],
    cas: "50650-76-5",
    rinse: lim(1.0),
    leave: lim(0.5),
  }),
  euRule({
    ref: "37",
    name: "2,2'-Methylenebis(6-bromo-4-chlorophenol)",
    aliases: ["bromochlorophene", "2,2'-methylenebis(6-bromo-4-chlorophenol)", "6,6-dibromo-4,4-dichloro-2,2'-methylene-diphenol"],
    cas: "15435-29-7",
    rinse: lim(0.1),
    leave: lim(0.1),
  }),
  euRule({
    ref: "38",
    name: "4-Isopropyl-m-cresol",
    aliases: ["4-isopropyl-m-cresol", "isopropyl-m-cresol", "4-isopropyl-3-methylphenol"],
    cas: "3228-02-2",
    rinse: lim(0.1),
    leave: lim(0.1),
  }),
  euRule({
    ref: "39",
    name: "Mixture of 5-Chloro-2-methyl-isothiazol-3(2H)-one and 2-Methylisothiazol-3(2H)-one with magnesium chloride and magnesium nitrate",
    aliases: ["methylchloroisothiazolinone", "methylisothiazolinone", "mci/mi", "kathon cg"],
    cas: "26172-55-4",
    rinse: lim(0.0015, "0.0015% (of the 3:1 mixture)"),
    leave: null,
  }),
  euRule({
    ref: "42",
    name: "N,N'-bis(4-chlorophenyl)-3,12-diimino-2,4,11,13-tetraazatetradecanediamidine and its salts",
    aliases: ["chlorhexidine", "chlorhexidine digluconate", "chlorhexidine diacetate", "chlorhexidine dihydrochloride"],
    cas: "55-56-1",
    rinse: lim(0.3, "0.3% (as chlorhexidine)"),
    leave: lim(0.3, "0.3% (as chlorhexidine)"),
  }),
  euRule({
    ref: "43",
    name: "1-Phenoxypropan-2-ol",
    aliases: ["1-phenoxypropan-2-ol", "phenoxyisopropanol"],
    cas: "770-35-4",
    rinse: lim(1.0),
    leave: null,
  }),
  euRule({
    ref: "44",
    name: "Alkyl (C12-C22) trimethyl ammonium bromide and chloride",
    aliases: ["cetrimonium bromide", "cetrimonium chloride", "alkyl trimethyl ammonium chloride"],
    cas: "17301-53-0",
    rinse: lim(0.1),
    leave: lim(0.1),
  }),
  euRule({
    ref: "45",
    name: "4,4-Dimethyl-1,3-oxazolidine",
    aliases: ["4,4-dimethyl-1,3-oxazolidine", "4,4-dimethyloxazolidine"],
    cas: "51200-87-4",
    rinse: lim(0.1),
    leave: lim(0.1),
  }),
  euRule({
    ref: "46",
    name: "Diazolidinyl urea",
    aliases: ["diazolidinyl urea"],
    cas: "78491-02-8",
    rinse: lim(0.5),
    leave: lim(0.5),
  }),
  euRule({
    ref: "47",
    name: "Benzenecarboximidamide, 4,4'-(1,6-hexanediylbis(oxy))bis-, and its salts",
    aliases: ["hexamidine", "hexamidine isethionate", "hexamidine diisethionate"],
    cas: "3811-75-4",
    rinse: lim(0.1),
    leave: lim(0.1),
  }),
  euRule({
    ref: "48",
    name: "Glutaraldehyde (Pentane-1,5-dial)",
    aliases: ["glutaraldehyde", "glutaral", "pentane-1,5-dial"],
    cas: "111-30-8",
    rinse: lim(0.1),
    leave: lim(0.1),
  }),
  euRule({
    ref: "49",
    name: "5-Ethyl-3,7-dioxa-1-azabicyclo[3.3.0] octane",
    aliases: ["5-ethyl-3,7-dioxa-1-azabicyclo[3.3.0] octane"],
    cas: "7747-35-5",
    rinse: lim(0.3),
    leave: lim(0.3),
  }),
  euRule({
    ref: "50",
    name: "3-(p-Chlorophenoxy)-propane-1,2-diol",
    aliases: ["chlorphenesin", "3-(p-chlorophenoxy)-propane-1,2-diol"],
    cas: "104-29-0",
    rinse: lim(0.3),
    leave: lim(0.3),
  }),
  euRule({
    ref: "51",
    name: "Sodium hydroxymethylamino acetate",
    aliases: ["sodium hydroxymethylamino acetate", "sodium hydroxymethylglycinate", "sodium n-(hydroxymethyl)glycinate"],
    cas: "70161-44-3",
    rinse: lim(0.5),
    leave: lim(0.5),
  }),
  euRule({
    ref: "52",
    name: "Silver chloride deposited on titanium dioxide",
    aliases: ["silver chloride deposited on titanium dioxide", "silver chloride", "silver chloride on titanium dioxide"],
    cas: "7783-90-6",
    rinse: lim(0.004, "0.004% (as AgCl)"),
    leave: lim(0.004, "0.004% (as AgCl)"),
  }),
  euRule({
    ref: "53",
    name: "Benzenemethanaminium, N,N-dimethyl-N-[2-[2-[4-(1,1,3,3-tetramethylbutyl)phenoxy]ethoxy]ethyl]-, chloride",
    aliases: ["benzethonium chloride"],
    cas: "121-54-0",
    rinse: lim(0.1),
    leave: lim(0.1),
  }),
  euRule({
    ref: "54",
    name: "Benzalkonium chloride, bromide and saccharinate",
    aliases: ["benzalkonium chloride", "benzalkonium bromide", "benzalkonium saccharinate", "benzalkonium"],
    cas: "8001-54-5",
    rinse: lim(0.1, "0.1% (as benzalkonium chloride)"),
    leave: lim(0.1, "0.1% (as benzalkonium chloride)"),
  }),
  euRule({
    ref: "55",
    name: "Benzyloxymethanol",
    aliases: ["benzyloxymethanol", "benzyl hydroxyoxymethan", "methanol, (phenylmethoxy)-"],
    cas: "14548-60-8",
    rinse: lim(0.15),
    leave: null,
  }),
  euRule({
    ref: "56",
    name: "3-Iodo-2-propynylbutylcarbamate",
    aliases: ["3-iodo-2-propynylbutylcarbamate", "iodopropynyl butylcarbamate", "ipbc"],
    cas: "55406-53-6",
    rinse: lim(0.02),
    leave: lim(0.01),
  }),
  euRule({
    ref: "57",
    name: "2-Methyl-2H-isothiazol-3-one",
    aliases: ["methylisothiazolinone", "2-methyl-2h-isothiazol-3-one", "mit"],
    cas: "2682-20-4",
    rinse: lim(0.0015, "0.0015% in rinse-off products"),
    leave: null,
  }),
  euRule({
    ref: "58",
    name: "Ethyl-N-alpha-dodecanoyl-L-arginate hydrochloride",
    aliases: ["ethyl-n-alpha-dodecanoyl-l-arginate hydrochloride", "ethyl lauroyl arginate", "lae"],
    cas: "60372-77-2",
    rinse: lim(0.4),
    leave: lim(0.4),
  }),
  euRule({
    ref: "59",
    name: "1,2,3-Propanetricarboxylic acid, 2-hydroxy-, monohydrate and 1,2,3-Propanetricarboxylic acid, 2-hydroxy-silver(1+) salt, monohydrate",
    aliases: ["silver citrate", "citric acid silver salt"],
    cas: "5949-29-1",
    rinse: lim(0.2, "0.2% (0.0024% silver)"),
    leave: lim(0.2, "0.2% (0.0024% silver)"),
  }),
  euRule({
    ref: "60",
    name: "4-(3-ethoxy-4-hydroxyphenyl)butan-2-one",
    aliases: ["4-(3-ethoxy-4-hydroxyphenyl)butan-2-one"],
    cas: "569646-79-3",
    rinse: lim(0.7),
    leave: lim(0.7),
  }),
  // Entry 61 appears twice in the source with identical content; emitted once to keep ids unique.
  euRule({
    ref: "61",
    name: "Silver zinc zeolite",
    aliases: ["silver zinc zeolite"],
    cas: "130328-20-0",
    rinse: null,
    leave: lim(1.0),
  }),
];

export type { Jurisdiction };
