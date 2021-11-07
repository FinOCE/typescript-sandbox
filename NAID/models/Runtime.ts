import Client from './Client'
import fs from 'fs'

export default class Runtime {
    constructor() {
        this.run()
    }

    public async run() {
        const client = new Client()
        await client.login()

        const photo = await client.generatePhoto(
            [145.683948, -16.783875, 145.698514, -16.773644], // Coordinates to photograph
            [2020, 11, 14], // Photograph date
            [512, 512] // Resolution of the image
        )

        const {json, png, unix} = photo

        const cloudCoverage = JSON.parse(json.toString()).scenes[0].tiles[0].cloudCoverage
        const file = `./output/${unix} (${cloudCoverage}%).png`
        
        fs.createWriteStream(file).write(png)
        console.log(`Successfully saved the file to ${file}`)
    }
}
