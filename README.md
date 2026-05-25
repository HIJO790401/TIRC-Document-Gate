# TIRC Document Gate — V1 Local Edition  
# 三重解釋權文件防火牆・本地版 V1

## 中文說明

### 這是什麼？

**TIRC Document Gate** 是一套本地部署的「機密文件交付前審查站」。

傳統權限系統通常只問：

> 這個人能不能打開文件？

TIRC 進一步追問：

> 這個人能不能移交這份文件？  
> 能不能解釋這份文件？  
> 能不能把這份文件最終交付給外部對象？  
> 如果交錯、誤用、外洩，誰負責？

所以，TIRC 不是單純的檔案開關，也不是取代密碼、SSO、IAM 或 DLP。  
它是在既有安全框架之上，增加一層：

**解釋權 + 責任鏈 + 審計回放**

---

## V1 Local Edition 目標

使用者下載 Repo 後，只需執行：

```bash
docker compose up --build

然後打開：

http://localhost:5173

就能在網頁完成完整流程：

匯入文件 → 設定三層解釋權 → 送審 → 看判定 → 看審計紀錄 → 驗證 hash-chain

這就是 V1 Local Edition 的完成定義。


---

V1 能做什麼？

目前 V1 可以做到：

在本地部署，不需要把機密文件送到外部雲端。

匯入文字或上傳文件。

支援 TXT、Markdown、PDF、DOCX。

為每份文件設定三層解釋權。

針對文件操作提出送審。

使用 ICC 規則引擎判定操作是否成立。

產生審計紀錄。

透過 hash-chain 驗證審計紀錄是否被破壞。

可選擇接本地模型作為「抽取輔助」，但最終判定仍由規則引擎決定。



---

三層解釋權

第一層｜只允許移交

T1_TRANSFER_ONLY

只能確認文件要交給誰、為什麼交、不能交給誰。
不能解釋文件內容，也不能對外交付。

第二層｜中層解釋權

T2_MIDDLE_INTERPRETATION

可以在內部摘要、協作、處理文件。
但不能把文件交付給外部對象。

第三層｜最終交付權

T3_FINAL_DELIVERY

可以最終交付文件。
但必須具備完整責任閉環，包括：

主體：誰要做？

邊界：只能在哪裡成立？

因果：為什麼要做？

回放：事後怎麼查？

修復：錯了誰修？

責任：後果誰扛？



---

V1 操作流程

進入首頁下方 V1 Local Edition 操作台，依序完成：

1. 身份流程
選擇目前操作者與文件 owner。


2. 匯入文件
貼上文字或上傳 TXT、Markdown、PDF、DOCX。


3. 文件列表
選擇一份文件並綁定目前流程。


4. 三層解釋權設定
勾選哪些使用者可以移交、內部解釋、最終交付。


5. 操作送審
選擇操作類型，並填寫主體、邊界、因果、回放、修復、責任。


6. 判定結果
系統顯示本次操作是允許、暫停審查、或阻斷。


7. 審計紀錄
查看每次送審紀錄。


8. 驗證 hash-chain
檢查審計鏈是否完整。




---

可審查的文件操作

目前支援以下操作：

移交

內部摘要

詢問本地模型

匯出

對外分享

最終交付


不同操作會對應不同需求層級：

移交 → 第一層｜只允許移交

摘要 / 詢問本地模型 / 匯出 → 第二層｜中層解釋權

對外分享 / 最終交付 → 第三層｜最終交付權



---

本地模型說明

V1 可選擇接本地模型，例如 Ollama。

但本地模型只用於輔助：

抽取主體

整理邊界

整理因果

整理回放

整理修復

整理責任


最終判定仍由 ICC 規則引擎決定。

也就是：

> 本地模型可以幫忙整理語意，
但不能決定文件能不能交付。



啟用本地模型模式：

LOCAL_LLM_ENABLED=true docker compose --profile llm up --build


---

啟動方式

git clone https://github.com/HIJO790401/TIRC-Document-Gate.git
cd TIRC-Document-Gate
docker compose up --build

開啟：

http://localhost:5173

後端 API：

http://localhost:8000


---

GitHub Pages 固定示範

GitHub Pages 只用於固定案例展示，不處理真實機密文件。

手動更新 GitHub Pages：

cd demo
npm install
npm run build:pages

GitHub 設定：

Settings → Pages → Deploy from branch → main / docs


---

V1 不宣稱什麼？

V1 不是完整企業 DLP 系統。

目前不宣稱：

自動接管整間公司所有文件。

自動攔截 Gmail、Slack、Google Drive、SharePoint。

取代 IAM、SSO、DLP。

自動完成企業級權限整合。

自動判斷所有機密外洩事件。


V1 的定位是：

> 本地部署的交付前文件解釋權審查站。




---

未來整合方向

未來可擴充：

SSO / IAM 整合

Google Drive 連接器

SharePoint 連接器

Slack / Gmail 連接器

GitHub / GitLab 連接器

企業 DLP 整合

Windows / Mac 端點代理程式



---

English Version

What is TIRC Document Gate?

TIRC Document Gate is a local-first pre-delivery review station for confidential documents.

Traditional access control usually asks:

> Can this user open the file?



TIRC asks further:

> Can this user transfer this file?
Can this user interpret this file?
Can this user finally deliver this file to an external party?
If the file is misused, leaked, or delivered incorrectly, who is responsible?



TIRC does not replace passwords, SSO, IAM, or DLP.
It adds an extra layer above existing security systems:

interpretation rights + responsibility chain + audit replay


---

V1 Local Edition Goal

After downloading this repository, the user only needs to run:

docker compose up --build

Then open:

http://localhost:5173

The full workflow can be completed in the browser:

Import document → Set three-level interpretation rights → Submit review → View decision → View audit log → Verify hash-chain

This is the completion definition of V1 Local Edition.


---

What V1 Can Do

V1 currently supports:

Local deployment.

No need to send confidential documents to an external cloud.

Text import and file upload.

TXT, Markdown, PDF, and DOCX support.

Per-document three-level interpretation rights.

Review request before document operation.

ICC deterministic rule-based decision.

Audit log generation.

Hash-chain verification.

Optional local model extraction assistance.



---

Three Interpretation Rights

Level 1 | Transfer Only

T1_TRANSFER_ONLY

The user can transfer the document to the correct internal recipient.
The user cannot interpret the document content or deliver it externally.

Level 2 | Middle Interpretation

T2_MIDDLE_INTERPRETATION

The user can summarize, discuss, or process the document internally.
The user cannot deliver it to an external party.

Level 3 | Final Delivery

T3_FINAL_DELIVERY

The user can finally deliver the document, but only with a complete responsibility closure:

Subject: Who is doing this?

Boundary: Where does this action apply?

Cause: Why is this action needed?

Replay: How can this be checked later?

Repair: Who fixes it if something goes wrong?

Responsibility: Who accepts the consequences?



---

V1 Workflow

In the V1 Local Edition Console, complete the following steps:

1. Identity Flow
Select current actor and document owner.


2. Import Document
Paste text or upload TXT, Markdown, PDF, or DOCX.


3. Document List
Select and bind one document.


4. Three-Level Policy
Select which users can transfer, interpret internally, or finally deliver the document.


5. Submit Review
Choose an action and fill in subject, boundary, cause, replay, repair, and responsibility.


6. Decision Result
View whether the request is allowed, held for review, or blocked.


7. Audit Log
Review all submitted actions.


8. Verify Hash-Chain
Check whether the audit chain remains intact.




---

Supported Review Actions

V1 supports:

Transfer

Internal summary

Ask local model

Export

External sharing

Final delivery


Each action maps to a required level:

Transfer → Level 1 | Transfer Only

Summary / Ask local model / Export → Level 2 | Middle Interpretation

External sharing / Final delivery → Level 3 | Final Delivery



---

Local Model

V1 can optionally connect to a local model such as Ollama.

The local model is only used to assist extraction:

Subject

Boundary

Cause

Replay

Repair

Responsibility


The final decision is still made by the ICC rule engine.

In other words:

> The local model may help organize meaning,
but it does not decide whether a document can be delivered.



Enable local model mode:

LOCAL_LLM_ENABLED=true docker compose --profile llm up --build


---

Run Locally

git clone https://github.com/HIJO790401/TIRC-Document-Gate.git
cd TIRC-Document-Gate
docker compose up --build

Open:

http://localhost:5173

Backend API:

http://localhost:8000


---

GitHub Pages Demo

GitHub Pages is only a static demo with fixed cases.
It does not process real confidential documents.

Manual GitHub Pages build:

cd demo
npm install
npm run build:pages

GitHub setting:

Settings → Pages → Deploy from branch → main / docs


---

What V1 Does Not Claim

V1 is not a full enterprise DLP system.

V1 does not claim to:

Automatically protect all company documents.

Automatically intercept Gmail, Slack, Google Drive, or SharePoint.

Replace IAM, SSO, or DLP.

Provide full enterprise permission integration.

Automatically detect every possible data leakage case.


V1 is positioned as:

> A local pre-delivery interpretation-rights review station for confidential documents.




---

Future Integrations

Possible future integrations:

SSO / IAM

Google Drive connector

SharePoint connector

Slack / Gmail connector

GitHub / GitLab connector

Enterprise DLP integration

Windows / Mac endpoint agent


