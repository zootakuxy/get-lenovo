import {BotService} from "../server/bot";
import * as fs from "node:fs";

let botService = new BotService();

botService.products( (error, response) => {
    if( error ) return console.log( error );
    fs.writeFileSync( "products.json", JSON.stringify( ( response.products ) ) );
});

botService.search( {
    name: "lenovo"
}, (error, response) => {
    if( error ) return console.log( error );
    console.log( response )
});

