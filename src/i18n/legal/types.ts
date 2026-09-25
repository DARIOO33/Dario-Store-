// The legal pages are long, so each language keeps them in its own file here rather than in the
// main dictionary. Same shape in every language.
export type LegalPage = {
  title: string;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
};

export type LegalTexts = { terms: LegalPage; privacy: LegalPage };
