// The legal pages are long, so each language keeps them in its own file here rather than in the
// main dictionary. Same shape in every language.
export type LegalPage = {
  title: string;
  intro: string;
  // `id`: an anchor so other pages can link to a section (/terms#aliexpress-picks).
  sections: { heading: string; paragraphs: string[]; id?: string }[];
};

export type LegalTexts = { terms: LegalPage; privacy: LegalPage };
