require('dotenv').config();
const axios = require('axios');

const monHeaders = {
    'Content-Type': 'application/json',
    'Authorization' : "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjI5OTUyODQyMSwiYWFpIjoxMSwidWlkIjo1MTA0ODgwNywiaWFkIjoiMjAyMy0xMS0yOVQxODoyMTowNi4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTQ3ODM4MzMsInJnbiI6InVzZTEifQ.7z4l1B1fzMLJYLqED1UVPhZSzOmDmjt9Sl5IsaEgavE",
    'API-Version' : '2023-10'
};
// test board id
// const BId = "5970874975";
// production board id
const BId =  "3890901811";
let currCursor = "";
    async function getMonData(query) {
        try{
        return await fetch ("https://api.monday.com/v2", {
            method: 'post',
            headers: monHeaders,
            body: JSON.stringify({
                'query' : query
            })
            }).then( 
                async res => 
                    {
                        const json = await res.json();
                        if ("data" in json) {
                        
                        console.log("getMonData response", JSON.stringify(json.data, null, 4));
                        return json.data;
                        } else {
                            console.log(JSON.stringify(json.errors));
                        }
                }
                )
        }
        catch (err) {
            console.log("Error: " + err);
        }
    }
    const firstQuery = `
    query {
        boards (ids: ${BId}) {
            items_page (limit: 100) {
                cursor
                items {
                    id
                    name
                    column_values {
                        id
                        text
                        
                    }
                    
                }   
            }
        }
    }
    `;
    function subsuquentQuery(cursor) {
        return `
    query {     
        next_items_page (limit: 100, cursor: "${currCursor}") {
            cursor
            items {
                id
                name
                column_values {
                    id
                    text  
                }
            }   
        }
    }
    `};

    async function getPhoneList() {
        let phoneList = [];
        let internationalPhoneList = [];
        function getList(query) {
            return axios.post('https://api.monday.com/v2', {
                query: query,
            }, {
                headers: monHeaders
            });
        };
        function addToPhoneList(response, first) {
            console.log('response', response.data.data.boards[0].items_page.items[0].column_values);
            if (first) {
                // production response unpacker
                response.data.data.boards[0].items_page.items.forEach(element => {
                    // if the element.column_values.find(column => column.id === 'opt_in_text8') is "No", skip the element
                    if (element.column_values.find(column => column.id === 'opt_in_text8').text === "No") {
                        return;
                    }
                    // if the column.id "color6" does not equal "Matched", skip the element
                    if (element.column_values.find(column => column.id === 'mirror').text !== "Active") {
                        return;
                    }

                    let name = element.name;
                    let phoneNumber = element.column_values.find(column => column.id === 'phone0').text;
                    
                    // if phoneNumber.length > 11, push to internationalPhoneList, else, push to phoneList
                    phoneNumber.length > 11 ? 
                    internationalPhoneList.push({name: name, phoneNumber: phoneNumber}) : 
                    phoneList.push({name: name, phoneNumber: phoneNumber});
                });
                // test response unpacker
                // response.data.data.boards[0].items_page.items.forEach(element => {
                //     phoneList.push(element.column_values.find(column => column.id === 'phone').text);
                // if (element.column_values.find(column => column.id === 'status_1').text == "Done") {
                //     return;
                // }
                // let name = element.column_values.find(column => column.id === 'person').text;
                // let phoneNumber = element.column_values.find(column => column.id === 'phone').text;
                // });
            } else {
                // subseuqent response unpacker
                response.data.data ? response.data.data.next_items_page.items.forEach(element => {
                    let name = element.name;
                    let phoneNumber = element.column_values.find(column => column.id === 'phone0').text;
                    phoneNumber.length > 11 ? internationalPhoneList.push({name: name, phoneNumber: phoneNumber}) : phoneList.push({name: name, phoneNumber: phoneNumber});
                }) : '';
            }
        }
console.log(phoneList, "phone list")
        try {
            const response = await getList(firstQuery);
            addToPhoneList(response, true);
            currCursor = response.data.data.boards[0].groups[0].items_page.cursor;
            while(currCursor !== null) {
                const nextResponse = await getList(subsuquentQuery(currCursor));
                addToPhoneList(nextResponse, false);
                currCursor ? currCursor = nextResponse.data.data.next_items_page.cursor : '';
            }
            return {domestic: phoneList, international: internationalPhoneList};
            
            
            // return phoneList;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function updateMondayItem (phoneNumber, respType) {
        let getResponseCount = `  query {
            boards (ids: ${BId} ) {
              items_page (query_params: {rules: [{column_id: "phone0", compare_value: ["${phoneNumber}"], operator:contains_text}]}) {
                items {
                  id
                  column_values(ids:["numbers1", "numbers12"]) {
                    id
                    text
                  }
                }
              }
            }
          }`;
        let updateCount, columnToUpdate, updateId;
        function updateQuery(id, column, count) {
            return `mutation {
                change_simple_column_value (board_id: ${BId}, item_id: ${id}, column_id: "${column}", value: "${count}") {
                    id
                }
            }`;
        }
        let mondata = await getMonData(getResponseCount)
        
        // if monData is undefined, then the phone number is not in the board, keep the server running
        if (mondata === undefined) {
            console.log("phone number not found");
            return;
        }
        // see if the response type is 'y' or 'n' and update the appropriate column
        columnToUpdate = (respType === 'y' ? 'numbers1' : 'numbers12');
        //get the current count of the yes or no colummn
        let count = mondata.boards[0].items_page.items[0]?.column_values.find(column => column.id === columnToUpdate).text || "0";
        // increment the count
        updateCount = (parseInt(count) + 1).toString();
        updateId = mondata.boards[0].items_page.items[0].id;
        // update the count
        getMonData(updateQuery(updateId, columnToUpdate, updateCount));

    }

    async function stopMessageMutation(phoneNumber) {
        let stopMutation = `mutation {
            create_item (board_id: 3890901811, item_name: "Stop Message", column_values: "{\"phone0\":\"${phoneNumber}\"}") {
              id
            }
          }`;
        getMonData(stopMutation);
    }

module.exports = {getMonData, getPhoneList, updateMondayItem};