
// Originally input a raster layer (aoi_r) as the area of interest. 
// Create vector layer from it for image filtering
var aoi = aoi_r.reduceToVectors({
  reducer: ee.Reducer.countEvery(),
  scale: 30,
  maxPixels:1e9,
});


// Function for cloud maskings of Landsat 8 SR
function maskL8sr(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = (1 << 3);
  var cloudsBitMask = (1 << 5);
  var snowBitMask = (1 << 4);
  // Get the pixel QA band.
  var qa = image.select('pixel_qa');
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
                 .and(qa.bitwiseAnd(cloudsBitMask).eq(0))
                .and(qa.bitwiseAnd(snowBitMask).eq(0));
  return image
  // Scale the data to reflectance and temperature.
      .select(['B[1-7]']).multiply(0.0001)
      .updateMask(mask);
}

// Query Landsat 8 archive, filter by aoi, and apply clould masking function
var dataset = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
                  .filterDate('2013-07-01', '2013-09-30')
                  .filterBounds(aoi)
                  .map(maskL8sr);

print(dataset);

// Create median composite
var varmedian=dataset.median();
// mask data to aoi
var varmedian = varmedian.updateMask(aoi_r);



// Calculate normalized difference bands
var ndvi = varmedian.normalizedDifference(['B5', 'B4']).rename('NDVI');
var ndmi = varmedian.normalizedDifference(['B5', 'B6']).rename('NDMI');
var nbr = varmedian.normalizedDifference(['B5', 'B7']).rename('NBR');
var gndvi = varmedian.normalizedDifference(['B5', 'B3']).rename('GNDVI');
// ratio bands
var sni = varmedian.select('B6').divide(varmedian.select('B5')).rename('SNI');
var rgi = varmedian.select('B4').divide(varmedian.select('B3')).rename('RGI');
// difference bands
var dvi = varmedian.select('B5').subtract(varmedian.select('B4')).rename('DVI');

print(dvi, "DVI");


// Use the normalizedDifference(A, B) to compute (A - B) / (A + B)
// var ndvi = varmedian.normalizedDifference(['B5', 'B4']);
var varmedian = varmedian.addBands([ndvi, ndmi, nbr, gndvi, sni, rgi, dvi]).float();

var ndviParams = {min: 0, max: 1, palette: ['white', 'green']};
Map.addLayer(ndvi, ndviParams, "NDVI");

//Print the information of the reduced image.
print(varmedian,'median_L8');


Map.setCenter(-119.2062, 37.1912, 9);
//Display reduced image in the map window.
Map.addLayer(varmedian,{
  min:0,
  max: 1, 
  gamma:2.4,
  bands: ['B4','B3', 'B2']},'median composite of cloud free images');
// Map.addLayer(varmedian, visParams);



//////////////////////////////
// export images
// //////////////////////////

Export.image.toDrive({
  image: varmedian.select('B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'),
  description: 'MedianComposite2013',
  scale: 30,
  maxPixels: 1e9,
  region: aoi,
  folder: 'GEE_Landsat_Exports',
  crs: 'EPSG:32611'
});
