import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ papers: [] });

  // PubMed検索でIDリストを取得
  const searchRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=20&retmode=json&sort=relevance`
  );
  const searchData = await searchRes.json();
  const ids: string[] = searchData.esearchresult?.idlist ?? [];

  if (ids.length === 0) return NextResponse.json({ papers: [] });

  // PubMed Summary APIで各論文の情報をJSON取得
  const summaryRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`
  );
  const summaryData = await summaryRes.json();
  const result = summaryData.result ?? {};

  // アブストはefetchで別途取得
  const fetchRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&rettype=abstract&retmode=xml`
  );
  const xml = await fetchRes.text();

  const papers = ids.map((id) => {
    const doc = result[id];
    if (!doc) return null;

    const title = doc.title ?? "タイトル不明";
    const authors = (doc.authors ?? []).slice(0, 5).map((a: { name: string }) => a.name).join(", ");
    const journal = doc.fulljournalname ?? doc.source ?? "";
    const year = doc.pubdate?.split(" ")?.[0] ?? "";

    // XMLからアブストを抽出（IDで該当部分を特定）
    const pmidIdx = xml.indexOf(`<PMID Version="1">${id}</PMID>`);
    let abstract = "";
    if (pmidIdx !== -1) {
      const articleStart = xml.lastIndexOf("<PubmedArticle>", pmidIdx);
      const articleEnd = xml.indexOf("</PubmedArticle>", pmidIdx);
      if (articleStart !== -1 && articleEnd !== -1) {
        const article = xml.slice(articleStart, articleEnd);
        const abstracts = Array.from(article.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g));
        abstract = abstracts.map(m => m[1].replace(/<[^>]+>/g, "")).join(" ").trim();
      }
    }

    const doi = (doc.articleids ?? []).find((a: { idtype: string; value: string }) => a.idtype === "doi")?.value ?? "";

    return {
      pubmed_id: id,
      title: title.replace(/<[^>]+>/g, "").trim(),
      authors,
      journal,
      year,
      abstract,
      doi,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    };
  }).filter(Boolean);

  return NextResponse.json({ papers });
}
