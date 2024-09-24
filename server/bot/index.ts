import {DOMParser} from "xmldom";
import xpath from "xpath";

export type Page = {
    number:number,
    page:string
}

export interface Product {
    name:string
    image:string
    price:number
    url:string
    description:string,
    page?:number
}

export type SearchOptions = {
    name?:string,
    fromPage?:number,
    toPage?:number,
    maxPrice?:number,
    minPrice?:number,
}

export type Failure = {
    error:Error,
    page:number,
    message:string,
    operation:string,
}

export class BotService {
    private origin = "https://webscraper.io";
    private home = `${this.origin}/test-sites/e-commerce/static/computers/laptops`;

    public getLenovo(){
        return this.netbooks( "lenovo" )
    }
    public netbooks( marca:string ){
        fetch(origin, { method: "GET" }).then((response:Response) => {
        })
    }


    rawOf( url:string, operation:string, returns:( error:Error, raw?:string )=>void){
        fetch( url, { method: "GET" }).then((response:Response) => {
            response.text().then( value => {
                returns( null, value );
            }).catch( reason =>{
                reason["operation"] = `rawOf/text/${operation}: [${url}]`;
                returns( reason)
            });
        }).catch( reason => {
            reason["operation"] = `rawOf/${operation}: [${url}]`;
            returns( reason );
        });
    }

    search( opts: SearchOptions, returns:( error:Error, response?:{
        products?:Product[],
        failures?:Failure[],
        founds:number
    } )=>void){
        this.products( (error, response) => {
            if( error ) return returns( error );
            let products = response.products.filter( product => {
                return (!opts.name || product.name?.toLowerCase().includes( opts.name.toLowerCase() ))
                    && ( !opts.minPrice || product.price >= opts.minPrice )
                    && ( !opts.maxPrice || product.price <= opts.maxPrice )
                    && ( !opts.fromPage || product.page >= opts.fromPage )
                    && ( !opts.toPage || product.price <= opts.toPage )
            });

            return returns( null, {
                products: products,
                failures: response.failures,
                founds: products.length
            });
        });
    }
    products( returns:( error:Error, response?:{
        products?:Product[],
        failures?:Failure[]
    } )=>void){
        this.pages( ( error, pages ) => {
            if( error ) return returns( error );

            Promise.all( pages.map( nextPage => new Promise<{
                page:number,
                products?:Product[],
                error?:Error}>( resolve => {
                this.productsOf( nextPage, (error, products ) => {
                    resolve( {
                        products,
                        error: error,
                        page: nextPage.number,
                    });
                })
            }))).then( value => {
                let products: Product[] = [];
                let failures:Failure[] = [];

                value.forEach( pageResponse => {
                    if( pageResponse.error ) return failures.push({
                        page: pageResponse.page,
                        error: pageResponse.error,
                        message: pageResponse.error.message,
                        operation: pageResponse.error["operation"]
                    });

                    products.push( ...pageResponse.products );
                });

                returns( null, {
                    products: products.sort( (a, b) => a.price - b.price ),
                    failures: failures
                })
            }).catch( reason => {
                reason["operation"] = "products";
                return returns( reason)
            })
        });
    }

    pages ( returns:( error:Error, pages?:Page[] )=>void ){
        this.rawOf( this.home, "pages", (error, raw) =>  {
            if( error ){
                error["operation"] = "pages";
                return returns( error );
            }
            const doc = new DOMParser({
                errorHandler: {
                    warning: null,
                    error: null,
                    fatalError: null
                }
            }).parseFromString(raw);

            const paginationLinks = xpath.select("//ul[@class='pagination']//a", doc) as any[];

            let max = 0;
            let extractError:Error;
            let pages = paginationLinks.map((link) => {
                try {
                    const hrefValue = xpath.select1("./@href", link); // Seleciona o atributo href diretamente
                    let number = Number( xpath.select("./text()", link).toString().trim() );
                    if( number > max ) max = number;
                    return {
                        number: number,
                        page: `${this.origin}${hrefValue.value}`
                    }

                } catch (e){
                    e["operation"] = "page/extract";
                    extractError = e as Error;
                }
            }).filter( value => !!value.number && !Number.isNaN( value.number ) );

            if( extractError ) return  returns( extractError );

            for (let i = 1; i <= max; i++) {
                if( !pages.find( value => value.number === i ) ) {
                    pages.push({
                        number: i,
                        page: `${this.origin}/test-sites/e-commerce/static/computers/laptops?page=${i}`
                    })
                }
            }
            pages.sort( (a, b) => a.number - b.number );
            returns( null, pages );
        })
    }

    productsOf( page:Page, returns:( error:Error, products?:Product[] )=>void){
        this.rawOf( page.page, "productsOf", ( error, raw) =>  {
            if( error ){
                return returns( error );
            }
            const doc = new DOMParser({
                errorHandler: {
                    warning: null,
                    error: null,
                    fatalError: null
                }
            }).parseFromString( raw );
            const productElements = xpath.select("//div[contains(@class, 'container test-site')]//div[contains(@class, 'product-wrapper card-body')]", doc) as any[];
            let extractError:Error;
            let products = productElements.map((product, index ) => {
                try {
                    const image = xpath.select1( "img/@src", product ).value;
                    const priceElement = xpath.select1("./div//h4[contains(@class, 'price')]", product);
                    const price = priceElement ? Number(priceElement.textContent.trim().replace(/\$/g, '')) : null;
                    const url = xpath.select1( "div//h4/a/@href", product ).value;
                    const name = xpath.select( "div//h4/a/text()", product ).toString().trim();
                    const description = xpath.select( "div//p[contains(@class, 'description')]//text()", product ).toString().trim();

                    return {
                        image,
                        price,
                        url: `${ this.origin}/${url}`,
                        name,
                        description,
                        page: page.number
                    }
                } catch ( e ) {
                    e["operation"] = "productsOf/extract";
                    extractError = e as Error || new Error( "Padrão não esparado, possivelmente houve uma mudança no site!" );;
                    return null;
                }
            });

            if( extractError ) return returns( extractError );
            returns( null, products.filter( value => !!value ));
        });
    }

}