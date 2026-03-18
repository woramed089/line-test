const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const LINE_TOKEN = "ใส่ CHANNEL ACCESS TOKEN";
const GROUP_ID = "C8f9e07b960f9c23c5445c3f8faf71ce8";

let requests = [];

// ================= FORM =================
app.get("/", (req, res) => {
  res.send(`
    <h1>📋 ฟอร์มลางาน</h1>
    <form action="/send" method="post">
      <input name="name" placeholder="ชื่อ"><br><br>
      <input name="type" placeholder="ประเภทลา"><br><br>
      <input name="start" placeholder="วันเริ่ม"><br><br>
      <input name="end" placeholder="วันสิ้นสุด"><br><br>
      <input name="reason" placeholder="เหตุผล"><br><br>
      <button type="submit">ส่ง</button>
    </form>
  `);
});

// ================= SEND =================
app.post("/send", async (req, res) => {
  const { name, type, start, end, reason } = req.body;

  const id = Date.now();

  requests.push({
    id, name, type, start, end, reason,
    status: "รออนุมัติ"
  });

  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + LINE_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: GROUP_ID,
      messages: [
        {
          type: "template",
          altText: "มีใบลางานใหม่",
          template: {
            type: "buttons",
            text:
`📌 ใบลางานใหม่
👤 ${name}
📄 ${type}
📅 ${start} - ${end}
📝 ${reason}`,
            actions: [
              {
                type: "postback",
                label: "✅ อนุมัติ",
                data: `approve:${id}`
              },
              {
                type: "postback",
                label: "❌ ปฏิเสธ",
                data: `reject:${id}`
              }
            ]
          }
        }
      ]
    })
  });

  res.send("✅ ส่งแล้ว");
});

// ================= WEBHOOK =================
app.post("/webhook", async (req, res) => {
  const events = req.body.events;

  for (let event of events) {

    if (event.type === "postback") {
      const data = event.postback.data;

      const [action, id] = data.split(":");

      const item = requests.find(r => r.id == id);

      if (item) {

        // ❗ กันกดซ้ำ
        if (item.status !== "รออนุมัติ") {
          await reply(event.replyToken, "⚠️ รายการนี้ถูกดำเนินการแล้ว");
          return;
        }

        if (action === "approve") {
          item.status = "อนุมัติแล้ว";

          await reply(event.replyToken,
`✅ อนุมัติแล้ว
👤 ${item.name}
📄 ${item.type}`);
        }

        if (action === "reject") {
          item.status = "ไม่อนุมัติ";

          await reply(event.replyToken,
`❌ ไม่อนุมัติ
👤 ${item.name}`);
        }
      }
    }
  }

  res.sendStatus(200);
});

// ================= REPLY =================
async function reply(replyToken, msg) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + LINE_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: msg }]
    })
  });
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});