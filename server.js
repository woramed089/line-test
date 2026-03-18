const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const LINE_TOKEN = "KdwbNzqvGgSAI8sbXcf9u3/T7T79JDUtZRBchCRLElK0TJE9GDs6uiqXVqMZBN02xLRGu5SI1JUgEEcBjPmq6hKvhJQLTJZFA+CpGpTm26U+kwkBjVOaum/70Ahdk3NL36iJRrY1bwCKovv26q2XFAdB04t89/1O/w1cDnyilFU=";
const USER_ID = "C8f9e07b960f9c23c5445c3f8faf71ce8";

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

  // 🔥 ส่งแบบมีปุ่ม
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + LINE_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: USER_ID,
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

  res.send("✅ ส่งแล้ว (ไปกดใน LINE)");
});

// ================= APPROVE =================
app.get("/approve/:id", async (req, res) => {
  const item = requests.find(r => r.id == req.params.id);

  if (item) {
    item.status = "อนุมัติแล้ว";

    await sendLine(`✅ อนุมัติแล้ว\n👤 ${item.name}`);
  }

  res.send("อนุมัติเรียบร้อย");
});

// ================= REJECT =================
app.get("/reject/:id", async (req, res) => {
  const item = requests.find(r => r.id == req.params.id);

  if (item) {
    item.status = "ไม่อนุมัติ";

    await sendLine(`❌ ไม่อนุมัติ\n👤 ${item.name}`);
  }

  res.send("ปฏิเสธแล้ว");
});

// ================= SEND LINE =================
async function sendLine(msg) {
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + LINE_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: USER_ID,
      messages: [{ type: "text", text: msg }]
    })
  });
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});

app.post("/webhook", async (req, res) => {
  const events = req.body.events;

  for (let event of events) {
    if (event.type === "postback") {
      const data = event.postback.data;

      const [action, id] = data.split(":");

      const item = requests.find(r => r.id == id);

      if (item) {
        if (action === "approve") {
          item.status = "อนุมัติแล้ว";

          await reply(event.replyToken, `✅ อนุมัติแล้ว\n👤 ${item.name}`);
        }

        if (action === "reject") {
          item.status = "ไม่อนุมัติ";

          await reply(event.replyToken, `❌ ไม่อนุมัติ\n👤 ${item.name}`);
        }
      }
    }
  }

  res.sendStatus(200);
});

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
