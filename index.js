const Discord = require("discord.js");
const client = new Discord.Client();
const prefix = "!";
const { Permissions } = require('discord.js');
const keepAlive = require("./server");
const request = require('request');

var activescams = "";
var inactivescams = "";
var newscams = "";

//global function toolbox
function escapestring(str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

function randomnumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function reply(message, content) {
  client.api.channels[message.channel.id].messages.post({
    data: {
      content: content,
      message_reference: {
        message_id: message.id,
        channel_id: message.channel.id,
        guild_id: message.guild.id
      }
    }
  })
}

//download scam database lists
function downloadlists() {
  console.log("Getting latest scam lists...");
  request.get("https://github.com/mitchellkrogza/Phishing.Database/raw/master/phishing-links-ACTIVE-TODAY.txt", function (error, response, body) {
    if (!error && response.statusCode == 200) {
      activescams = body.replace(/https:\/\//g, "");
      activescams = activescams.replace(/http:\/\//g, "");
      activescams = activescams.split("\n");
      activescams = activescams.filter(function (el) {
        return el != null;
      });
      console.log("got active scams")
    } else {
      console.log("Error: failed active scam list check")
    }
  });
  
  request.get("https://github.com/mitchellkrogza/Phishing.Database/raw/master/phishing-domains-INACTIVE.txt", function (error, response, body) {
    if (!error && response.statusCode == 200) {
      inactivescams = body.replace(/https:\/\//g, "");
      inactivescams = inactivescams.replace(/http:\/\//g, "");
      inactivescams = inactivescams.split("\n");
      inactivescams = inactivescams.filter(function (el) {
        return el != null;
      });
      console.log("got inactive scams");
    } else {
      console.log("Error: failed inactive scam list check")
    }
  });
  
  request.get("https://github.com/mitchellkrogza/Phishing.Database/raw/master/phishing-links-NEW-today.txt", function (error, response, body) {
    if (!error && response.statusCode == 200) {
      newscams = body.replace(/https:\/\//g, "");
      newscams = newscams.replace(/http:\/\//g, "");
      newscams = newscams.split("\n");
      newscams = newscams.filter(function (el) {
        return el != null;
      });
      console.log("got new scams");
    } else {
      console.log("Error: failed latest scam list check")
    }
  });
}

downloadlists();

setInterval(() => {
  downloadlists();
}, 500000);

//check for scams
function checkforscams(msg) {
  return new Promise((resolve, reject) => {
    let textcontent = msg.content;
  
    console.log("Checking msg");
    
    let scamtype = "none";
    for(let i = 0; i < activescams.length-1; i++) {
      if(textcontent.includes(activescams[i])) {
        scamtype = "active";
        for(let i = 0; i < newscams.length-1; i++) {
          if(textcontent.includes(newscams[i])) {
            scamtype += " new";
            resolve(scamtype);
          }
        }
        resolve(scamtype);
        break;
      }
    }
  
    if(scamtype === "none") {
      for(let i = 0; i < inactivescams.length-1; i++) {
        if(textcontent.includes(inactivescams[i])) {
          scamtype = "inactive";
    
          for(let i = 0; i < newscams.length-1; i++) {
            if(textcontent.includes(newscams[i])) {
              scamtype += " new";
              resolve(scamtype);
            }
          }

          resolve(scamtype);
          break;
        }
      }

      for(let i = 0; i < newscams.length-1; i++) {
        if(textcontent.includes(newscams[i])) {
          scamtype = "active new";
          resolve(scamtype);
          break;
        }
      }
    }

    resolve(scamtype);
  });
}

//do init tasks here
client.on("ready", () => {
  console.log("ok")
  //set username
  client.user.setUsername("AntiPhisher");

  //count users
  var serverlist = "";
  var count = 0;
  client.guilds.cache.forEach((guild) => {
      count += guild.memberCount;
  })
  //set status
  client.user.setActivity("links with " + count + " users | !help", { type: "WATCHING"});
  setInterval(() => {
      client.user.setActivity("links with " + count + " users | !help", { type: "WATCHING"});
  }, 10000);

});

//do when bot joins server
client.on("guildCreate", guild => {
  if(guild != null) {
    let defaultChannel = "";
    guild.channels.cache.forEach((channel) => {
      if(channel.name.toLowerCase().includes("general") || channel.name.toLowerCase().includes("welcome")) {
        if(channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
          defaultChannel = channel;
        }
      }
    });

    //defaultChannel will be the channel object that the bot first finds permissions for
    defaultChannel.send("Thanks for inviting me! I will let you guys know if anyone sends a phishing or otherwise dangrous link in the server.");
  }
});
//on message
client.on("message", function(message) {
  try {
    if(message.author.id === "946576557697273866") return;

    //check if link is spam
    checkforscams(message).then(response => {
      let threat = false;
      let replymsg = "";
      let msgcolor = "";
      response = response.split(" ");
      if(response[0] !== "none") {
        threat = true;
      }
      if (response[0] === "active") {
        replymsg = "Warning: that message contains a spam/phishing/malware link that was active today! This link is active so do not click it!"
        msgcolor = "#de3131";
      } else if (response[0] === "inactive") {
        replymsg = "Warning: that message contains an inactive spam/phishing/malware link. This link may or may not work, but use caution and avoid clicking it regardless. Please note that this link may still be harmful."
        msgcolor = "#decb1f";
      }

      if (response[1] === "new") {
        replymsg += "```Additional note: This link was just detected in the last 24 hours and may still be relatively unknown, so don't click it.```"
      }

      if(threat == true) {
        let replyembed = new Discord.MessageEmbed()
          .setColor(msgcolor)
          .setTitle("Dangerous link detected!")
          .setThumbnail("https://cdn.discordapp.com/avatars/946576557697273866/0e7c230eeaafe9880a12661877bd1ca8.webp?size=256")
          .setDescription(replymsg)
          .setFooter(`The phishing link was sent by @${message.author.username}`)
        message.react("⚠️")
        reply(message, "^ Phishing link detected ^");
        message.reply(replyembed);
      }
    });

    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    //general commands
    if (command === "ping") {
      const timeTaken = Math.abs(Date.now() - message.createdTimestamp);
      message.reply(` pong! \`${timeTaken}ms\``);
    } else if (command === "stats") {
      var usercount = 0;
      client.guilds.cache.forEach((guild) => {
          usercount += guild.memberCount;
      })

      var latency = `${Math.round(client.ws.ping)}`;
      var lagstatus = "Unknown";
      if (latency < 150) {
        lagstatus = "Good";
      } else if (latency > 150 && latency < 300) {
        lagstatus = "OK";
      } else {
        lagstatus = "Poor";
      }

      const ggEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setAuthor("AntiPhisher")
        .setThumbnail("https://cdn.discordapp.com/avatars/946576557697273866/0e7c230eeaafe9880a12661877bd1ca8.webp?size=256")
        .addFields(
          { name: "Bot Stats", value: "AntiPhisher is in **" + client.guilds.cache.size + "** servers with **" + usercount + "** users." },
          { name: ":satellite: API Latency (ping)", value: lagstatus + " | " + latency + "ms", inline: true }
        )
        .setDescription("A bot that helps stop scammers from sending scam and phishing links.")
      message.reply(ggEmbed);
    } else if (command === "help") {
      const ggEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle("AntiPhisher Help")
        .setThumbnail("https://cdn.discordapp.com/avatars/946576557697273866/0e7c230eeaafe9880a12661877bd1ca8.webp?size=256")
        .setDescription("A bot that helps stop scammers from sending scam and phishing links. Besides these commands, the bot will also check every message for phishing, dangerous, or scam links.\n\n**Commands:**\n`!ping` Gets ping.\n`!stats` Returns bot stats.\n`!help` Shows this message (cool, right?)")
        .setFooter(`Requested by @${message.author.username}`)
      message.reply(ggEmbed);
    }
    //ending
  } catch(e) {
    const ggEmbed = new Discord.MessageEmbed()
      .setColor('#0099ff')
       .setTitle("Uh oh...")
      .setDescription("We hit an error. Error details:```" + e + "```")
    message.reply(ggEmbed);
    console.log(e);
  }
});


keepAlive()
client.login(process.env.token);
