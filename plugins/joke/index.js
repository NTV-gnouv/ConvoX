class JokePlugin {
    constructor(api, config) {
        this.api = api;
        this.config = config;
        this.name = 'Joke Plugin';
        this.version = '1.0.0';
        this.jokes = [
            {
                setup: "Tại sao lập trình viên thích đi làm vào ban đêm?",
                punchline: "Vì ban ngày có quá nhiều bug! 😂"
            },
            {
                setup: "Có bao nhiêu lập trình viên cần để thay bóng đèn?",
                punchline: "Không có ai cả, đó là vấn đề phần cứng! 🔧"
            },
            {
                setup: "Tại sao lập trình viên không thích thiên nhiên?",
                punchline: "Vì có quá nhiều bug! 🐛"
            },
            {
                setup: "Lập trình viên đi vào quán bar...",
                punchline: "Và order một beer. Sau đó order một beer. Sau đó order một beer... (vòng lặp vô hạn) 🔄"
            },
            {
                setup: "Tại sao lập trình viên luôn nhầm lẫn giữa Halloween và Christmas?",
                punchline: "Vì Oct 31 = Dec 25! 🎃🎄"
            },
            {
                setup: "Có 10 loại người trên thế giới:",
                punchline: "Những người hiểu binary và những người không hiểu! 💻"
            },
            {
                setup: "Tại sao lập trình viên thích Python?",
                punchline: "Vì nó không có dấu chấm phẩy! 🐍"
            },
            {
                setup: "Lập trình viên nói với vợ:",
                punchline: "Anh yêu em như anh yêu code - không bao giờ có lỗi! 💕"
            }
        ];
    }

    async initialize() {
        console.log('😄 Joke Plugin initialized');
    }

    async cleanup() {
        console.log('😄 Joke Plugin cleaned up');
    }

    async handleJokeCommand(event, args) {
        try {
            const { threadID } = event;
            
            // Get random joke
            const randomJoke = this.jokes[Math.floor(Math.random() * this.jokes.length)];
            
            const jokeText = `
😄 **CHUYỆN CƯỜI LẬP TRÌNH**

**Câu hỏi:** ${randomJoke.setup}

**Trả lời:** ${randomJoke.punchline}

---
🎭 *Gõ \`${this.config.bot?.prefix || '!'}joke\` để nghe chuyện cười khác!*
            `;
            
            await this.api.sendMessage(jokeText, threadID);
            
        } catch (error) {
            console.error('❌ Error in joke command:', error);
            await this.api.sendMessage('❌ Lỗi khi kể chuyện cười!', event.threadID);
        }
    }

    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: 'Tells programming jokes and funny stories'
        };
    }
}

module.exports = JokePlugin;
