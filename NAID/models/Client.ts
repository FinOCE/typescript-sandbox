/// @ts-ignore
import fetch from 'node-fetch'
import FormData from 'form-data'
import qs from 'qs'
import fs from 'fs'
import tar from 'tar'

type BBox = [number, number, number, number]
type Time = [number, number, number]
type Resolution = [number, number]

interface QueryData {
    request: string
    evalscript: string
}

interface ResponseData {
    json: Buffer
    png: Buffer
    unix: number
}

export default class Client {
    private access_token?: string

    public async generatePhoto(bbox: BBox, time: Time, resolution: Resolution): Promise<ResponseData> {
        function formatDate(year: number, month: number, day: number) {
            let monthString = month < 10 ? `0${month}` : month
            let dayString = day < 10 ? `0${day}` : day
            return `${year}-${monthString}-${dayString}T00:00:00Z`
        }
        
        let buffer = await this.query('process', {
            request: `
                {
                    "input": {
                        "bounds": {
                            "bbox": ${JSON.stringify(bbox)}
                        },
                        "data": [
                            {
                                "type": "sentinel-2-l2a",
                                "dataFilter": {
                                    "timeRange": {
                                        "from": "${formatDate(time[0], time[1], time[2])}",
                                        "to": "${formatDate(time[0], time[1], time[2] + 1)}"
                                    }
                                }
                            }
                        ]
                    },
                    "output": {
                        "width": ${resolution[0]},
                        "height": ${resolution[1]},
                        "responses": [{
                            "identifier": "default",
                            "format": {"type": "image/png"}
                        }, {
                            "identifier": "userdata",
                            "format": {"type": "application/json"}
                        }]
                    }
                }
            `,
            evalscript: `
                function setup() {
                    return {
                        input: ["B02", "B03", "B04"],
                        mosaicking: Mosaicking.ORBIT,
                        output: { id:"default", bands: 3}
                    }
                }
              
                function updateOutputMetadata(scenes, inputMetadata, outputMetadata) {
                    outputMetadata.userData = { "scenes":  scenes.orbits }
                }
              
                function evaluatePixel(samples) {
                    return [ 2.5*samples[0].B04, 2.5*samples[0].B03, 2.5*samples[0].B02 ]
                }
            `
        })

        let unix = Date.now()

        fs.writeFileSync(`./output/tar/${unix}.tar`, buffer)

        return new Promise((resolve, reject) => {
            let i = 0
            let json: Buffer
            let png: Buffer

            tar.t({file: `./output/tar/${unix}.tar`, onentry: entry => {
                entry.on('data', (buffer: Buffer) => {
                    /// @ts-ignore
                    if (entry.path === 'userdata.json') {
                        json = buffer
                    /// @ts-ignore
                    } else if (entry.path === 'default.png') {
                        png = buffer
                    }

                    if (++i == 2)
                        resolve({json, png, unix})
                })
            }})
        })
    }

    private async query(endpoint: string, data: QueryData) {
        if (!this.access_token) throw new Error('Client is not logged in!')

        let formData = new FormData()
        formData.append('request', data.request)
        formData.append('evalscript', data.evalscript)

        let res: ArrayBuffer = await fetch(`https://services.sentinel-hub.com/api/v1/${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.access_token}`,
                'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
                'Content-Length': formData.getLength(() => {}),
                'Accept': 'application/tar'
            },
            body: formData
        }).then((res: Response) => res.arrayBuffer())

        return Buffer.from(res)
    }

    public async login() {
        const { access_token } = await fetch('https://services.sentinel-hub.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
            },
            body: qs.stringify({
                client_id: process.env.client_id,
                client_secret: process.env.client_secret,
                grant_type: 'client_credentials'
            })
        }).then((res: any) => res.json())

        this.access_token = access_token
    }
}
