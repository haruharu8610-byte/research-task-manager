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

  // IDから論文詳細を取得
  const fetchRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&retmode=xml`
  );
  const xml = await fetchRes.text();

  // XMLをパース
  const papers = ids.map((id) => {
    const articleRegex = new RegExp(`<PubmedArticle>[\\s\\S]*?<PMID[^>]*>${id}</PMID>[\\s\\S]*?</PubmedArticle>`);
    const articleMatch = xml.match(articleRegex);
    if (!articleMatch) return null;
    const article = articleMatch[0];

    const title = article.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/)?.[1]?.replace(/<[^>]+>/g, "") ?? "タイトル不明";
    const abstract = article.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/)?.[1]?.replace(/<[^>]+>/g, "") ?? "";
    const journal = article.match(/<Title>([\s\S]*?)<\/Title>/)?.[1]?.replace(/<[^>]+>/g, "") ?? "";
    const year = article.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/)?.[1] ?? "";

    const authorMatches = Array.from(article.matchAll(/<Author[^>]*>[\s\S]*?<LastName>([\s\S]*?)<\/LastName>[\s\S]*?(?:<ForeName>([\s\S]*?)<\/ForeName>)?[\s\S]*?<\/Author>/g));
    const authors = authorMatches.slice(0, 5).map((m) => `${m[1]} ${m[2] ?? ""}`.trim()).join(", ");

    const doi = article.match(/<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/)?.[1] ?? "";

    return {
      pubmed_id: id,
      title: title.trim(),
      authors,
      journal,
      year,
      abstract: abstract.trim(),
      doi,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    };
  }).filter(Boolean);

  return NextResponse.json({ papers });
}
