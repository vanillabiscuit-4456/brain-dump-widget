export default async function handler(req, res) {
  try {
    const NOTION_API_KEY = process.env.NOTION_API_KEY;
    const DATABASE_ID = process.env.NOTION_DATABASE_ID;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    if (!NOTION_API_KEY || !DATABASE_ID) {
      return res.status(500).json({
        error: "Missing env vars",
        hasKey: !!NOTION_API_KEY,
        hasDB: !!DATABASE_ID,
      });
    }

    if (req.method === "GET") {
      const folder = req.query.folder;
      const filter = folder
        ? { property: "フォルダ", select: { equals: folder } }
        : undefined;

      const body = {
        sorts: [{ property: "作成日時", direction: "descending" }],
      };
      if (filter) body.filter = filter;

      const url = "https://api.notion.com/v1/databases/" + DATABASE_ID + "/query";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + NOTION_API_KEY,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ notionError: data });
      }

      const memos = data.results.map((page) => ({
        id: page.id,
        memo: page.properties["メモ"]?.title?.[0]?.plain_text || "",
        folder: page.properties["フォルダ"]?.select?.name || "",
        created: page.created_time,
      }));
      return res.status(200).json(memos);
    }

    if (req.method === "POST") {
      const { memo, folder } = req.body;
      const response = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + NOTION_API_KEY,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent: { database_id: DATABASE_ID },
          properties: {
            メモ: { title: [{ text: { content: memo } }] },
            フォルダ: { select: { name: folder } },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ notionError: data });
      }

      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
