const response = await fetch("http://127.0.0.1:3000/api/follow-up", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    condition: "visual",
    fragment: "休日に友人と公園を歩いた。",
    history: [{ question: "最初の質問", answer: "公園の入口から歩き始めた。" }],
    turn: 2,
  }),
});
const body = await response.json();
if (!response.ok) {
  console.error(JSON.stringify({ status: response.status, body }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: response.status, body }, null, 2));
}
