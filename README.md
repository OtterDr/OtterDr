<div align="center">
    <img src="assets/otter-icon.png" alt="OtterDr Logo" width="128" />
    <h1>OtterDr</h1>
    <h3><em>Your Friendly AI Debugging Companion</em></h3>
    <p>OtterDr is a playful yet powerful VS Code extension that helps you understand and fix code errors using AI, guided by an expressive otter that reacts to the health of your code.</p>





OtterDr is a playful yet powerful VS Code extension that helps you **understand and fix code errors using AI**, guided by an expressive otter that reacts to the health of your code.

\<placeholder for tags\>



## **📌 About**

**OtterDr** is a VS Code extension that notices errors in your code and explains them using AI. When an error appears, your otter looks confused. Just select the code causing the problem, ask OtterDr for help, and see an easy to understand explanation right inside VS Code.

OtterDr is designed to make debugging:

* **Less intimidating, by simplifying complex errors**

* **More educational,** by explaining the “why” behind the fix

* And a little more fun 🦦


---

## **📑 Table of Contents**

* Product Description

* Features

* Installation

* Initial Setup (OpenAI API Key)

* Usage Guide

* Screenshots & GIFs

* Development & Contributing

* Roadmap

* Changelog

* License

* Contributors

* FAQ




## **🧠 Product Description**

### **What does OtterDr do?**

OtterDr helps you understand and fix coding errors. You select the code that’s causing a problem, and OtterDr sends it to an AI. The AI then explains the error clearly in a panel inside VS Code.

### **What problem does it solve?**

Error messages and stack traces are often cryptic or poorly documented, leading to wasted time. OtterDr streamlines the debugging process by providing immediate clarity when:

* **Learning new stacks:** Quickly deciphers unfamiliar errors when working with a new language, framework, or library  
* **Context switching:** Saves mental energy by translating technical jargon into actionable insights without leaving your editor  
* **Beyond a “quick fix”:** Encourages a deeper understanding of *why* an error occurred, helping you write more resilient code


---

### **Features**

### **Otter Mascot**

* 🦦 **Real-time interaction:**, OtterDr reacts to your coding environment as you work

* 😕 **Visual Diagnostics:**  OtterDr shows confusion when VS Code detects compiler errors or issues

* 😊 **Interactivity:**  Scratch OtterDr’s belly to brighten your dev session\! 

  ### **AI-Powered Assistance**

* 🎯 **Targeted Analysis:**  Select specific code snippets to receive focused, context-aware explanations 

* 📊 **One-Click Insights:**  Use the OtterDr Status Bar button to instantly trigger the AI response panel with insight into your highlighted code 

* 🤖 **Integrated UI:**  Access clear, AI-generated explanations and solutions directly within a dedicated VS Code panel 


---

## **📥 Installation**

### **From VS Code Marketplace**

1. Open **Visual Studio Code**

2. Go to the **Extensions** panel (Ctrl+Shift+X)

3. Search for **OtterDr**

4. Click **Install**

---

### **From Source (for contributors)**

1. Open your terminal and clone the repo:  
   `git clone https://github.com/OtterDr/OtterDr.git`  
   `cd OtterDr`

2. Install dependencies:  
    `npm install`

3. Build the extension:  
    `npm run compile` 

4. Open VS Code and run the extension in **Development Mode** (press `F5`)

---

**🔑 Initial Setup – OpenAI API Key**

OtterDr requires an OpenAI API Key to generate explanations and suggestions

* **First Use**: The first time you click the **OtterDr button** in the Status Bar, you will be prompted to enter your key  
*   
* **Secure Storage:** Once entered, your key is stored securely in VS Code’s **SecretStorage**


---

### **Manage Your API Key**

If you need to change or remove your key later, use the Command Palette (Cmd/Ctrl \+ Shift \+ P): 

* ### **✏️ Update Key:** Search for `OtterDr: Update API Key`

* ### **🗑️ Delete Key:** Search for `OtterDr: Delete API Key`


---

## **🧪 Usage Guide**

### **1️⃣ Detect Errors**

* When VS Code detects errors in the current file, 🦦 your OtterDr displays **confusion**

### **2️⃣ Select the Error Code**

* Highlight **only the relevant code snippet** (you can include surrounding lines for context). 

⚠️ *Tip: Avoid selecting the entire file — keep it focused on the specific error for the most accurate AI response*

### **3️⃣ Trigger OtterDr AI**

* Click the **OtterDr button in the Status Bar.** The panel will open and send your code for analysis


### **4️⃣ View AI Explanation**

* Read the explanation and fix suggestions. Once the error is resolved, 🦦 **your OtterDr becomes happy again** 🎉

---

## **🎥 Screenshots & GIFs**

### **Otter Mood Change**

\<img src="assets/otter-mood.gif" width="500"/\>

### **Selecting an Error & Getting AI Help**

\<img src="assets/otter-workflow.gif" width="500"/\>

*Tip: You can create GIFs using ScreenToGif (Windows) or Kap (Mac).*

---

## **🛠️ Development & Contributing**

We ❤️ contributions\!

### **Contribution Guidelines**

1. **Fork** the repository and create a feature branch:  
    `git checkout -b feature/your-feature`

2. **Commit** your changes with clear, descriptive messages

3. Open a **Pull Request** for the team to review

---

### **Run in Dev Mode**

1. `npm install`

2. `npm run watch` (Compiles code and listens for changes)

3. Press `F5` in VS Code to launch the Extension Development Host.

---

## **🗺️ Roadmap**

| Feature | Status |
| :---- | :---- |
| Otter mood reactions | ✅ |
| Inline error selection | ✅ |
| AI explanation panel | ✅ |
| Multiple error selection | ⏳ |
| Auto error detection per cursor | ⏳ |
| Custom AI prompts | 🙏🏻 |
| Offline fallback explanations | 🙏🏻 |
| Comprehensive Test Suite | 🙏🏻 |
| Support for additional LLMs | 🙏🏻 |
| Add command for user to disable extension | 🙏🏻 |

✅ Ready  |   ⏳ In Progress  |   🙏🏻 Looking for Contributors

---

## **📝 Changelog**

### **V1.0.0 \- February 24, 2026**

* Initial release

* Otter mascot with mood states

* Inline code selection  
  AI-powered error explanations

---

## **📄 License**

This project is licensed under the **MIT License**. See `LICENSE.md` for details.

---

## **👩‍💻 Contributors**

| Sofia Rodas  [🐙 · GitHub](https://github.com/sofiso99) [🖇️ · LinkedIn](https://www.linkedin.com/in/sofiarodas/) Creator & Maintainer | Hyeyoon (Elaine) Sung  [🐙 · GitHub](https://github.com/shy-blue-sky)  [🖇️ · LinkedIn](https://www.linkedin.com/in/hyeyoon-sung-a74378228/)  Creator & Maintainer | Stormi Stearns  [🐙 · GitHub](https://github.com/stormi25-cell)   [🖇️ · LinkedIn](https://www.linkedin.com/in/essie-stearns-099912169/)  Creator & Maintainer |
| :---- | :---- | :---- |
| **Katy Wells**  [🐙 · GitHub](https://github.com/katygus)  [🖇️ · LinkedIn](http://www.linkedin.com/in/katy-wells)  Creator & Maintainer | **Delilah Lopez**  [🐙 · GitHub](https://github.com/DLopez43)   [🖇️ · LinkedIn](https://www.linkedin.com/in/delilah-lopez/)  Creator & Maintainer |  |

---

## **❓ FAQ**

**Does OtterDr AI fix my code automatically?**  
 No — it explains errors so *you* learn how to fix them.

**Is my code stored anywhere?**  
 No. Code snippets are only sent to OpenAI for analysis and are not saved by the extension.

---

## **⭐ Support the Project**

If you enjoy OtterDr AI:

* ⭐ Star the repo

* 🦦 Share it with friends

* 🛠️ Contribute a feature

Happy debugging\! 🦦✨

