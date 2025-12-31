export default async function handler(req, res) {
  const url = req.query.url;
  const r = await fetch(url);
  const text = await r.text();
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(text);
}
