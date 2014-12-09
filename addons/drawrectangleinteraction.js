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
ol.interaction.DrawRectangle = function(options) {

  goog.base(this, options);
};
goog.inherits(ol.interaction.DrawRectangle, ol.interaction.Draw);

/**
 * Handle down events.
 * @param {ol.MapBrowserEvent} event A down event.
 * @return {boolean} Pass the event to other interactions.
 */
ol.interaction.DrawRectangle.prototype.handlePointerDown = function(event) {
  console.log('pointer down!!!');
  if (this.condition_(event)) {
    this.downPx_ = event.pixel;
    return true;
  } else {
    return false;
  }
};