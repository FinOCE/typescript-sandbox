/// @ts-ignore
import fetch from 'node-fetch'
import FormData from 'form-data'
import qs from 'qs'

interface QueryData {
    request: string
    evalscript: string
}

export default class Client {
    private access_token?: string

    public async query(endpoint: string, data: QueryData) {
        if (!this.access_token) throw new Error('Client is not logged in!')

        let formData = new FormData()
        formData.append('request', data.request)
        formData.append('evalscript', data.evalscript)

        return await fetch(`https://services.sentinel-hub.com/api/v1/${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.access_token}`,
                'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
                'Content-Length': formData.getLength(() => {})
            },
            body: formData
        })//.then((res: any) => res.json())
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
