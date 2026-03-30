const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function getCrearBotEmbed() {

  const embed = new EmbedBuilder()
    .setColor("Purple")
    .setTitle("🤖 Crear tu bot paso a paso (PRO)")
    .setDescription(`
🚀 Sigue estos pasos para crear tu bot completo:

**1️⃣ Crear aplicación**
👉 Ve a:
https://discord.com/developers/applications  
👉 "New Application" → crea tu bot

**2️⃣ Crear el BOT**
👉 Entra en "Bot" → "Add Bot"

**3️⃣ Obtener TOKEN**
👉 Bot → Reset Token → cópialo 🔑

**4️⃣ Obtener CLIENT ID**
👉 "General Information" → copia el ID

**5️⃣ Código del bot**
👉 Usa el comando:
/codigo

💻 Ahí tendrás el GitHub con todos los archivos

**6️⃣ Crear cuenta en Railway**
👉 https://railway.app  
👉 Inicia sesión con GitHub

**7️⃣ Subir el bot**
👉 Conecta tu repo de GitHub  
👉 Railway detecta automáticamente el proyecto

**8️⃣ Variables de entorno**
👉 En Railway agrega:

TOKEN=tu_token  
CLIENT_ID=tu_id  

**9️⃣ Iniciar bot**
👉 Railway lo ejecuta automáticamente 🚀

🔟 Invitar el bot
👉 Usa:
/invite

🔥 ¡Y listo! Tu bot estará online 24/7
`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("codigo_btn")
      .setLabel("💻 Ver código")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("archivos")
      .setLabel("📄 Archivos base")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("zip")
      .setLabel("📦 Descargar bot")
      .setStyle(ButtonStyle.Success)
  );

  return { embed, row };
}

module.exports = { getCrearBotEmbed };
