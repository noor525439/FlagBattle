
export const handleGameCommands = (io, commentBatch) => {
    commentBatch.forEach(data => {

        const text = data.message.toLowerCase().trim();


        if (text === 'bomb') {
            console.log(`💣 Action: Bomb by ${data.username}`);
            io.emit('action:bomb', { 
                by: data.username, 
                power: 25 
            });
        }

        if (data.countryCode && data.countryCode !== 'snake') {
            console.log(`🏳️ Action: Country detected - ${data.countryCode}`);
            io.emit('action:country', {
                countryCode: data.countryCode,
                username: data.username,
                profilePic: data.profilePic
            });
        }
    });
};