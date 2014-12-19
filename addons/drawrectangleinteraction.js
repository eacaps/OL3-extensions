goog.provide('ol.interaction.DrawRectangle');

goog.require('goog.asserts');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('ol.Collection');
goog.require('ol.Coordinate');
goog.require('ol.Feature');
goog.require('ol.FeatureOverlay');
goog.require('ol.Map');
goog.require('ol.MapBrowserEvent');
goog.require('ol.MapBrowserEvent.EventType');
goog.require('ol.Object');
goog.require('ol.events.condition');
goog.require('ol.geom.GeometryType');
goog.require('ol.geom.LineString');
goog.require('ol.geom.MultiLineString');
goog.require('ol.geom.MultiPoint');
goog.require('ol.geom.MultiPolygon');
goog.require('ol.geom.Point');
goog.require('ol.geom.Polygon');
goog.require('ol.source.Vector');
goog.require('ol.style.Style');
goog.require('ol.interaction.Draw');

/**
 * @classdesc
 * Interaction that allows drawing geometries.
 *
 * @constructor
 * @extends {ol.interaction.Pointer}
 * @fires ol.DrawEvent
 * @param {olx.interaction.DrawOptions} options Options.
 * @api stable
 */
ol.interaction.DrawRectangle = function(opt_options) {

  var options = goog.isDef(opt_options) ? opt_options : {};
  
  options.type = ol.interaction.DrawMode.POLYGON;

  goog.base(this, options);
  
  this.type_ = ol.interaction.DrawRectangleMode.RECTANGLE;
  this.mode_ = ol.interaction.DrawRectangleMode.RECTANGLE;
};
goog.inherits(ol.interaction.DrawRectangle, ol.interaction.Draw);

/**
 * Handle down events.
 * @param {ol.MapBrowserEvent} event A down event.
 * @return {boolean} Pass the event to other interactions.
 */
ol.interaction.DrawRectangle.prototype.handlePointerDown = function(event) {
  if (this.condition_(event)) {
    this.downPx_ = event.pixel;
    return true;
  } else {
    return false;
  }
};


/**
 * Handle up events.
 * @param {ol.MapBrowserEvent} event An up event.
 * @return {boolean} Pass the event to other interactions.
 */
ol.interaction.DrawRectangle.prototype.handlePointerUp = function(event) {
  var downPx = this.downPx_;
  var clickPx = event.pixel;
  var dx = downPx[0] - clickPx[0];
  var dy = downPx[1] - clickPx[1];
  var squaredDistance = dx * dx + dy * dy;
  var pass = true;
  if (squaredDistance <= this.squaredClickTolerance_) {
    this.handlePointerMove_(event);
    if (goog.isNull(this.finishCoordinate_)) {
      this.startDrawing_(event);
    } else if (this.mode_ === ol.interaction.DrawMode.POINT ||
        this.atFinish_(event)) {
      this.finishDrawing();
    } else {
      this.addToDrawing_(event);
    }
    pass = false;
  }
  return pass;
};


/**
 * Handle move events.
 * @param {ol.MapBrowserEvent} event A move event.
 * @return {boolean} Pass the event to other interactions.
 * @private
 */
ol.interaction.DrawRectangle.prototype.handlePointerMove_ = function(event) {
  if (!goog.isNull(this.finishCoordinate_)) {
    this.modifyDrawing_(event);
  } else {
    this.createOrUpdateSketchPoint_(event);
  }
  return true;
};


/**
 * Determine if an event is within the snapping tolerance of the start coord.
 * @param {ol.MapBrowserEvent} event Event.
 * @return {boolean} The event is within the snapping tolerance of the start.
 * @private
 */
ol.interaction.DrawRectangle.prototype.atFinish_ = function(event) {
  var at = false;
  if (!goog.isNull(this.sketchFeature_)) {
    var geometry = this.sketchFeature_.getGeometry();
    var potentiallyDone = false;
    var potentiallyFinishCoordinates = [this.finishCoordinate_];
    if (this.mode_ === ol.interaction.DrawRectangleMode.RECTANGLE) {
      goog.asserts.assertInstanceof(geometry, ol.geom.Polygon);
      potentiallyDone = geometry.getCoordinates()[0].length >
          this.minPointsPerRing_;
      potentiallyFinishCoordinates = [this.sketchPolygonCoords_[0][0],
        this.sketchPolygonCoords_[0][this.sketchPolygonCoords_[0].length - 2]];
		
		var curlength = geometry.getCoordinates()[0].length
		if(curlength == 5) {
			return true;
		}
    }
    if (potentiallyDone) {
      var map = event.map;
      for (var i = 0, ii = potentiallyFinishCoordinates.length; i < ii; i++) {
        var finishCoordinate = potentiallyFinishCoordinates[i];
        var finishPixel = map.getPixelFromCoordinate(finishCoordinate);
        var pixel = event.pixel;
        var dx = pixel[0] - finishPixel[0];
        var dy = pixel[1] - finishPixel[1];
        at = Math.sqrt(dx * dx + dy * dy) <= this.snapTolerance_;
        if (at) {
          this.finishCoordinate_ = finishCoordinate;
          break;
        }
      }
    }
  }
  return at;
};


/**
 * @param {ol.MapBrowserEvent} event Event.
 * @private
 */
ol.interaction.DrawRectangle.prototype.createOrUpdateSketchPoint_ = function(event) {
  var coordinates = event.coordinate.slice();
  if (goog.isNull(this.sketchPoint_)) {
    this.sketchPoint_ = new ol.Feature(new ol.geom.Point(coordinates));
    this.updateSketchFeatures_();
  } else {
    var sketchPointGeom = this.sketchPoint_.getGeometry();
    goog.asserts.assertInstanceof(sketchPointGeom, ol.geom.Point);
    sketchPointGeom.setCoordinates(coordinates);
  }
};


/**
 * Start the drawing.
 * @param {ol.MapBrowserEvent} event Event.
 * @private
 */
ol.interaction.DrawRectangle.prototype.startDrawing_ = function(event) {
  var start = event.coordinate;
  this.finishCoordinate_ = start;
  var geometry;
	if (this.mode_ === ol.interaction.DrawRectangleMode.RECTANGLE) {
      this.sketchLine_ = new ol.Feature(new ol.geom.LineString([start.slice(),
            start.slice()]));
      this.sketchPolygonCoords_ = [[start.slice(), start.slice()]];
      geometry = new ol.geom.Polygon(this.sketchPolygonCoords_);
    }
  goog.asserts.assert(goog.isDef(geometry));
  this.sketchFeature_ = new ol.Feature();
  if (goog.isDef(this.geometryName_)) {
    this.sketchFeature_.setGeometryName(this.geometryName_);
  }
  this.sketchFeature_.setGeometry(geometry);
  this.updateSketchFeatures_();
  this.dispatchEvent(new ol.DrawEvent(ol.DrawEventType.DRAWSTART,
      this.sketchFeature_));
};


/**
 * Modify the drawing.
 * @param {ol.MapBrowserEvent} event Event.
 * @private
 */
ol.interaction.DrawRectangle.prototype.modifyDrawing_ = function(event) {
  var coordinate = event.coordinate;
  var geometry = this.sketchFeature_.getGeometry();
  var coordinates, last;
    if (this.mode_ === ol.interaction.DrawRectangleMode.RECTANGLE) {
      goog.asserts.assertInstanceof(geometry, ol.geom.Polygon);
      coordinates = this.sketchPolygonCoords_[0];
    }
    var sketchPointGeom = this.sketchPoint_.getGeometry();
    goog.asserts.assertInstanceof(sketchPointGeom, ol.geom.Point);
    sketchPointGeom.setCoordinates(coordinate);
    last = coordinates[coordinates.length - 1];
    last[0] = coordinate[0];
    last[1] = coordinate[1];
    if (this.mode_ === ol.interaction.DrawRectangleMode.RECTANGLE) {
      var sketchLineGeom = this.sketchLine_.getGeometry();
      goog.asserts.assertInstanceof(sketchLineGeom, ol.geom.LineString);
      sketchLineGeom.setCoordinates(coordinates);
      goog.asserts.assertInstanceof(geometry, ol.geom.Polygon);
	  var box = new ol.geom.Polygon(this.sketchPolygonCoords_);
	  var ext = box.getExtent();
	  var b = ext[0];
	  var l = ext[1];
	  var t = ext[2];
	  var r = ext[3];
	  var boxcoords = [[[t,l],[t,r],[b,r],[b,l],[t,l]]];
      geometry.setCoordinates(boxcoords);
	  //geometry.setCoordinates(this.sketchPolygonCoords_);
    }
  this.updateSketchFeatures_();
};


/**
 * Add a new coordinate to the drawing.
 * @param {ol.MapBrowserEvent} event Event.
 * @private
 */
ol.interaction.DrawRectangle.prototype.addToDrawing_ = function(event) {
  var coordinate = event.coordinate;
  var geometry = this.sketchFeature_.getGeometry();
  var coordinates;
  if (this.mode_ === ol.interaction.DrawRectangleMode.RECTANGLE) {
	this.sketchPolygonCoords_[0].splice(1,1)
    this.sketchPolygonCoords_[0].push(coordinate.slice());
    goog.asserts.assertInstanceof(geometry, ol.geom.Polygon);
    geometry.setCoordinates(this.sketchPolygonCoords_);
  }
  this.updateSketchFeatures_();
};


/**
 * Stop drawing and add the sketch feature to the target layer.
 * @api
 */
ol.interaction.DrawRectangle.prototype.finishDrawing = function() {
  var sketchFeature = this.abortDrawing_();
  goog.asserts.assert(!goog.isNull(sketchFeature));
  var coordinates;
  var geometry = sketchFeature.getGeometry();
  if (this.mode_ === ol.interaction.DrawRectangleMode.RECTANGLE) {
    goog.asserts.assertInstanceof(geometry, ol.geom.Polygon);
    // When we finish drawing a polygon on the last point,
    // the last coordinate is duplicated as for LineString
    // we force the replacement by the first point
    //this.sketchPolygonCoords_[0].pop();
    //this.sketchPolygonCoords_[0].push(this.sketchPolygonCoords_[0][0]);
    //geometry.setCoordinates(this.sketchPolygonCoords_);
    coordinates = geometry.getCoordinates();
  }

  if (!goog.isNull(this.features_)) {
    this.features_.push(sketchFeature);
  }
  if (!goog.isNull(this.source_)) {
    this.source_.addFeature(sketchFeature);
  }
  this.dispatchEvent(new ol.DrawEvent(ol.DrawEventType.DRAWEND, sketchFeature));
};


/**
 * Stop drawing without adding the sketch feature to the target layer.
 * @return {ol.Feature} The sketch feature (or null if none).
 * @private
 */
ol.interaction.DrawRectangle.prototype.abortDrawing_ = function() {
  this.finishCoordinate_ = null;
  var sketchFeature = this.sketchFeature_;
  if (!goog.isNull(sketchFeature)) {
    this.sketchFeature_ = null;
    this.sketchPoint_ = null;
    this.sketchLine_ = null;
    this.overlay_.getFeatures().clear();
  }
  return sketchFeature;
};


/**
 * Redraw the skecth features.
 * @private
 */
ol.interaction.DrawRectangle.prototype.updateSketchFeatures_ = function() {
  var sketchFeatures = [];
  if (!goog.isNull(this.sketchFeature_)) {
    sketchFeatures.push(this.sketchFeature_);
  }
  if (!goog.isNull(this.sketchLine_)) {
    //sketchFeatures.push(this.sketchLine_);
  }
  if (!goog.isNull(this.sketchPoint_)) {
    sketchFeatures.push(this.sketchPoint_);
  }
  this.overlay_.setFeatures(new ol.Collection(sketchFeatures));
};


/**
 * @private
 */
ol.interaction.DrawRectangle.prototype.updateState_ = function() {
  var map = this.getMap();
  var active = this.getActive();
  if (goog.isNull(map) || !active) {
    this.abortDrawing_();
  }
  this.overlay_.setMap(active ? map : null);
};

/**
 * Draw mode.  This collapses multi-part geometry types with their single-part
 * cousins.
 * @enum {string}
 */
ol.interaction.DrawRectangleMode = {
  RECTANGLE: 'RECTANGLE'
};