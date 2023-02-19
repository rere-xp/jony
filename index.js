const fs = require("fs")
const pino = require("pino")
const chalk = require("chalk")
const baileys = require("@adiwajshing/baileys")
const { Boom } = require("@hapi/boom")
const { state, saveState } = baileys.useSingleFileAuthState("session.json")

const store = baileys.makeInMemoryStore({
	logger: pino().child({
		level: "silent",
		stream: "store"
	})
})


async function startBotAutoKick() {
	const { version, isLatest } = await baileys.fetchLatestBaileysVersion()
	const Ahok = baileys.default({
		version,
		auth: state,
		printQRInTerminal: true,
		browser: ["WhatsApp Bot", "safari", "1.0.0"],
		logger: pino({
			level: "silent"
		})
	})
	
	store.bind(Ahok.ev)
	Ahok.ev.on("creds.update", saveState)
	
	Ahok.ev.on("messages.upsert", async (chatUpdate) => {
		try {
			mek = chatUpdate.messages[0]
			if (!mek.message) return 
			if (mek.key.fromMe) return
			if (!mek.key.remoteJid.endsWith("@g.us")) return Ahok.readMessages([mek.key])
			mek.message = (Object.keys(mek.message)[0] === "ephemeralMessage") ? mek.message.ephemeralMessage.message : mek.message
			await Ahok.readMessages([mek.key])
			
			const idChat = mek.key.id
			const from = mek.key.remoteJid
			const fromMe = mek.key.fromMe
			const type = await baileys.getContentType(mek.message)
			const sender = Ahok.decodeJid(mek.key.participant)
			const botNumber = Ahok.decodeJid(Ahok.user.id)
			
			const groupMetadata = await Ahok.groupMetadata(from)
			const groupName = groupMetadata.subject
			const participants = await groupMetadata.participants
			const groupAdmins = await Ahok.getGroupAdmins(participants)
			
			const isBotAdmins = groupAdmins.includes(botNumber) || false
			const isAdmins = groupAdmins.includes(sender) || false
			
			if (!isBotAdmins) return
			if (isAdmins) return 
			if (type == undefined) return Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
				
			const body = (type === "conversation") ? await mek.message.conversation : (type == "imageMessage") ? await mek.message.imageMessage.caption : (type == "videoMessage") ? await mek.message.videoMessage.caption : (type == "extendedTextMessage") ? await mek.message.extendedTextMessage.text : ""
			const kata = /http|https|.com|co.id|my.id|.link|.app|youtu.be|wa.me|t.me|chat.whatsapp.com|vcs|open|readi|ready|order|bayar|byr|berbayar|testi|testimoni|join|shop|rekber|real|tobat|jual|pribadi|menit/i
			const cek = await kata.exec(body)
			
			if (cek) {
				await Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
				Ahok.groupParticipantsUpdate(from, [sender], "remove")
			}
			if (body.length > 30) {
				await Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
				Ahok.groupParticipantsUpdate(from, [sender], "remove")
			}
			if (type === "documentMessage") {
				await Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
				Ahok.groupParticipantsUpdate(from, [sender], "remove")
			}
			if (type === "contactMessage") {
				await Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
				Ahok.groupParticipantsUpdate(from, [sender], "remove")
			}
			if (type === "audioMessage") {
				await Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
			}
			if (type === "contactsArrayMessage") {
				await Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
			}
			if (type === "pollCreationMessage") {
				await Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
			}
			if (type === "liveLocationMessage") {
				await Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
			}
			if (type === "locationMessage") {
				await Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
			}
		} catch (err) {
			console.log("Messages Upsert ERROR => ", err)
		}
	})
	
	Ahok.ev.on("group-participants.update", async (update) => {
		const botNumber = Ahok.decodeJid(Ahok.user.id)
		const groupMetadata = await Ahok.groupMetadata(update.id) || ""
		const participants = await groupMetadata.participants || ""
		const groupAdmins = await Ahok.getGroupAdmins(participants) || ""
		const isBotAdmins = groupAdmins.includes(botNumber) || false
		const nomor = update.participants[0]
		const kickers = nomor.startsWith("62") ? true : false
		
		if (update.action == "add") {
			if (!isBotAdmins) return
			if (!kickers) return Ahok.groupParticipantsUpdate(update.id, [nomor], "remove")
		}
	})
	
	Ahok.ev.on("connection.update", async (update) => {
		const { connection, lastDisconnect } = update 
		if (connection === "connecting") console.log("Menghubungkan")
		if (connection === "open") console.log("Berhasil")
		if (connection === "close") {
			const reason = new Boom(lastDisconnect?.error)?.output.statusCode
			if (reason === baileys.DisconnectReason.badSession) {
				console.log("File Sesi Buruk Harap Hapus Sesi dan Pindai Lagi")
				Ahok.logout()
			} else if (reason === baileys.DisconnectReason.connectionClosed) {
				console.log("Koneksi ditutup")
				startBotAutoKick()
			} else if (reason === baileys.DisconnectReason.connectionLost) {
				console.log("Koneksi Hilang dari Server")
				startBotAutoKick()
			} else if (reason === baileys.DisconnectReason.connectionReplaced) {
				console.log("Koneksi Diganti, Sesi Baru Dibuka, Harap Tutup Sesi Saat Ini Terlebih Dahulu")
				Ahok.logout()
			} else if (reason === baileys.DisconnectReason.loggedOut) {
				console.log("Perangkat Keluar, Harap Pindai Lagi Dan Jalankan")
				Ahok.logout()
			} else if (reason === baileys.DisconnectReason.restartRequired) {
				console.log("Mulai Ulang Diperlukan")
				startBotAutoKick()
			} else if (reason === baileys.DisconnectReason.timedOut) {
				console.log("Waktu koneksi berakhir")
				startBotAutoKick()
			} else Ahok.end(`Alasan Putus Tidak Diketahui: ${reason} | ${connection}`)
		}
	})
	
	Ahok.decodeJid = (jid) => {
		if (!jid) return jid
		if (/:\d+@/gi.test(jid)) {
			let decode = baileys.jidDecode(jid) || {}
			return decode.user && decode.server && decode.user + "@" + decode.server || jid
		} else return jid
	}
	Ahok.getGroupAdmins = (participants) => {
		let admins = []
		for (let i of participants) {
			i.admin === "superadmin" ? admins.push(i.id) :  i.admin === "admin" ? admins.push(i.id) : ""
		}
		return admins || []
	}
	Ahok.hapusPesan = (client, from, a, b, c) => {
		return client.sendMessage(from, {
			delete: {
				remoteJid: from,
				fromMe: a,
				id: b,
				participant: c
			}
		})
	}
	
	return Ahok
}
startBotAutoKick()