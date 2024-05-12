export const postRequest = (
    url: string,
    headers: any,
    body: any,
    callback: (json: any) => void
) => {
    // return promise that returns json from request and also catches errors
    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...headers
        },
        body: JSON.stringify({
            ...body
        })
    }).then(response => response.json())
    .then(json => {
        callback(json);
        return json;
    }).catch(error => {
        callback({ error: error });
        return { error: error };
    });
};