// chatModel.js
class ChatModel {
    constructor(db) {
        this.collection = db.collection('chats'); // Reference to the 'chats' collection
    }

    async create(chatMessage) {
        const result = await this.collection.insertOne(chatMessage);
        return result;
    }

    async findAll() {
        const messages = await this.collection.find({}).sort({ timestamp: 1 }).toArray();
        return messages;
    }
}

module.exports = ChatModel
