// =========== GET DATA AND CONFIG FROM URL PARAMETERS =================
window.addEventListener('load', () => {
    let d = "../networks/"
    controls = {};
    controls['file_path'] = d + 'network.json';
    d3.json(d + 'data.json', function(_data) {
        d3.json(d + 'config.json', new_controls => {
            controls = {...controls, ...new_controls}
            vis(controls, _data);
        })
    })

})