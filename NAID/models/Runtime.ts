import Client from './Client'
import fs from 'fs'

export default class Runtime {
    constructor() {
        this.run()
    }

    public async run() {
        const client = new Client()
        await client.login()

        let res = await client.query('process', {
            request: `
                {
                    "input": {
                        "bounds": {
                            "properties": {
                                "crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
                            },
                            "bbox": [
                                13.822174072265625,
                                45.85080395917834,
                                14.55963134765625,
                                46.29191774991382
                            ]
                        },
                        "data": [
                            {
                                "type": "sentinel-2-l2a",
                                "dataFilter": {
                                    "timeRange": {
                                        "from": "2018-10-01T00:00:00Z",
                                        "to": "2018-12-31T00:00:00Z"
                                    }
                                }
                            }
                        ]
                    },
                    "output": {
                        "width": 512,
                        "height": 512
                    }
                }
            `,
            evalscript: `
                //VERSION=3

                function setup() {
                    return {
                        input: ["B02", "B03", "B04"],
                        output: { 
                        bands: 3, 
                        sampleType: "AUTO" // default value - scales the output values from [0,1] to [0,255].
                        }
                    }
                }

                function evaluatePixel(sample) {
                    return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02]
                }
                `
        })

        console.log(res)

        //fs.writeFileSync(`./output/${Date.now()}.png`, res)
    }
}
