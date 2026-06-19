const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("/home/node/.n8n/database.sqlite");

const hist = db.prepare("SELECT versionId, nodes FROM workflow_history WHERE workflowId = ? ORDER BY createdAt DESC LIMIT 1").get("ZAIquQfRij398nXv");
const nodes = JSON.parse(hist.nodes);

const filterIF = nodes.find(n => n.id === "63847ff2-af9f-4a69-b3df-640d78436144");
filterIF.parameters.conditions = {
  options: { caseSensitive: false, leftValue: "", typeValidation: "loose" },
  conditions: [
    {
      leftValue: "={{ String($json.body.data.key.fromMe) }}",
      operator: { type: "string", operation: "notEquals" },
      rightValue: "true"
    },
    {
      leftValue: "={{ $json.body.data.messageType }}",
      operator: { type: "string", operation: "equals" },
      rightValue: "conversation"
    }
  ],
  combinator: "and"
};

const setNode = nodes.find(n => n.type === "n8n-nodes-base.set");
if (setNode && setNode.parameters && setNode.parameters.assignments) {
  const phoneAssign = setNode.parameters.assignments.assignments.find(a => a.name === "phoneNumber");
  if (phoneAssign) {
    phoneAssign.value = "={{ ($json.body.data.key.remoteJid || '').split('@')[0] }}";
  }
}

const r1 = db.prepare("UPDATE workflow_history SET nodes = ? WHERE versionId = ?").run(JSON.stringify(nodes), hist.versionId);
const r2 = db.prepare("UPDATE workflow_entity SET nodes = ?, updatedAt = ? WHERE id = ?").run(JSON.stringify(nodes), new Date().toISOString(), "ZAIquQfRij398nXv");

const verify = JSON.parse(db.prepare("SELECT nodes FROM workflow_history WHERE versionId = ?").get(hist.versionId).nodes);
const check = verify.find(n => n.id === "63847ff2-af9f-4a69-b3df-640d78436144");
console.log("history updated:", r1.changes, "entity updated:", r2.changes);
console.log("New filter conditions:", check.parameters.conditions.conditions.map(c => c.rightValue).join(", "));
db.close();
