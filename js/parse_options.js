// =========== GET DATA AND CONFIG FROM URL PARAMETERS =================
window.addEventListener('load', () => {
    loadNetwork("../networks/all/");
})

function loadNetwork(path) {
    controls = {};
    controls['file_path'] = path + 'network.json';
    d3.json(path + 'data.json', function(_data) {
        d3.json(path + 'config.json', new_controls => {
            controls = {...controls, ...new_controls}
            vis(controls, _data);
        })
    })
}