const {Intents, Client} = require("discord.js")

const extractFrames = require("ffmpeg-extract-frames")
const pixels = require('image-pixels')
const sharp = require('sharp');
const fs = require("fs-extra")
const ytdl = require("ytdl-core")

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const tokens = require("./tokens.json")

const bots = tokens.map(token => {
    const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] })
    client.login(token)
    return client
})

function chunkArray(myArray, chunk_size){
    var results = [];

    while (myArray.length) {
        results.push(myArray.splice(0, chunk_size));
    }

    return results;
}

const extract = async () => {
    await fs.emptyDirSync("./frames")

    await extractFrames({
        input: './ytvideo.mp4',
        output: './frames/frame-%d.png',
        fps: 5
      })

    const numFrames = await fs.readdirSync('./frames').length

    let frames = []

    for(let i = 1; i < numFrames + 1; i++){
        const data = await sharp(`./frames/frame-${i}.png`)
        .resize(54, 30)
        .toBuffer()

        const image = await pixels(data, {cache: true})

        let array = Array.from(image.data)

        const result = chunkArray(array, 4)
        const messageArray = result.map((p, i) => {

            let char = ""
            if(i % 54 === 0 && i !== 0){
                char = "\n"
            }
            const lum = ((p[0] + p[1] + p[2]) / 3);


            if(lum >= 230){
                return char += "⬜"
            }  else if(lum >= 200){
                return char += "⚪"
            }  else if(lum >= 180){
                return char += "🤍"
            }  else if(lum >= 160){
                return char += "🔲"
            }  else if(lum >= 140){
                return char += "📹"
            }  else if(lum >= 110){
                return char += "🌑"
            } else if(lum >= 80){
                return char += "🔳"
            } else if(lum >= 50){
                return char += "🖤"
            } else if(lum >= 20){
                return char += "⚫"
            } else{
                return char += "⬛"
            }
        })

        frames.push("```" + messageArray.join("") + "```")
    }

    let bi = 0, fi = 0;

    const play = async () => {
        const frame = frames[++fi]
        if(!frame) return;
        bots[++bi%bots.length].channels.cache.get("880297274691964931").send(frame)
        setTimeout(play, 200);
    }

    play()

    await fs.emptyDirSync("./frames")
}

const prefix = "$"

bots[0].on("ready", (client) => {
    client.on("messageCreate", async (message) => {
        if(message.content.startsWith(prefix)){
            const [CMD_NAME, ...args] = message.content.trim().substring(prefix.length).split(/\s+/)

            if(CMD_NAME === "play"){
                ytdl(args[0], {quality: "lowestvideo"})
                    .pipe(fs.createWriteStream("./ytvideo.mp4"))
                    .once("finish", extract)
            }
        }
    })
})