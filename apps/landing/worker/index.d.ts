declare const worker: {
    fetch(request: Request, env: {ASSETS: {fetch(input: Request | URL): Promise<Response>}}): Promise<Response>;
};
export default worker;
