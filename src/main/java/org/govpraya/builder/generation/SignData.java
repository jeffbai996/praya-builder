package org.govpraya.builder.generation;
import com.google.gson.*;
import net.kyori.adventure.text.serializer.gson.GsonComponentSerializer;
import org.bukkit.DyeColor;
import org.bukkit.block.BlockState;
import org.bukkit.block.Sign;
import org.bukkit.block.sign.Side;

/** Detached, bounded sign-only data; never accepts arbitrary block-entity NBT. */
public final class SignData {
 private SignData() {}
 public static JsonElement read(BlockState state) {
  if (!(state instanceof Sign sign)) return JsonNull.INSTANCE;
  JsonObject result=new JsonObject();
  for(Side side:Side.values()){
   var source=sign.getSide(side);JsonObject data=new JsonObject();JsonArray lines=new JsonArray();
   source.lines().forEach(line->lines.add(GsonComponentSerializer.gson().serialize(line)));
   data.add("lines",lines);data.addProperty("color",source.getColor().name().toLowerCase(java.util.Locale.ROOT));data.addProperty("glowing",source.isGlowingText());
   result.add(side==Side.FRONT?"front":"back",data);
  }
  result.addProperty("waxed",sign.isWaxed());return result;
 }
 public static JsonElement checked(JsonElement value, boolean required) {
  if(value==null||value.isJsonNull()){if(required)throw new IllegalArgumentException("Sign data required");return JsonNull.INSTANCE;}
  if(!required)throw new IllegalArgumentException("Sign data on non-sign block");
  if(!value.isJsonObject()||value.toString().length()>16384)throw new IllegalArgumentException("Invalid sign data");
  JsonObject o=value.getAsJsonObject();if(!o.keySet().equals(java.util.Set.of("front","back","waxed")))throw new IllegalArgumentException("Invalid sign fields");
  if(!o.get("waxed").isJsonPrimitive()||!o.getAsJsonPrimitive("waxed").isBoolean())throw new IllegalArgumentException("Invalid wax flag");
  for(String side:new String[]{"front","back"}){
   JsonObject s=o.getAsJsonObject(side);if(!s.keySet().equals(java.util.Set.of("lines","color","glowing")))throw new IllegalArgumentException("Invalid sign side");
   DyeColor.valueOf(s.get("color").getAsString().toUpperCase(java.util.Locale.ROOT));
   if(!s.get("glowing").isJsonPrimitive()||!s.getAsJsonPrimitive("glowing").isBoolean())throw new IllegalArgumentException("Invalid glow flag");
   JsonArray lines=s.getAsJsonArray("lines");if(lines.size()!=4)throw new IllegalArgumentException("Sign requires four lines per side");
   for(JsonElement line:lines){if(!line.isJsonPrimitive()||!line.getAsJsonPrimitive().isString()||line.getAsString().length()>2048)throw new IllegalArgumentException("Sign component too large");GsonComponentSerializer.gson().deserialize(line.getAsString());}
  }
  return o.deepCopy();
 }
 public static void write(Sign sign,JsonElement value){
  JsonObject o=checked(value,true).getAsJsonObject();
  for(Side side:Side.values()){
   JsonObject s=o.getAsJsonObject(side==Side.FRONT?"front":"back");var target=sign.getSide(side);
   for(int i=0;i<4;i++)target.line(i,GsonComponentSerializer.gson().deserialize(s.getAsJsonArray("lines").get(i).getAsString()));
   target.setColor(DyeColor.valueOf(s.get("color").getAsString().toUpperCase(java.util.Locale.ROOT)));target.setGlowingText(s.get("glowing").getAsBoolean());
  }
  sign.setWaxed(o.get("waxed").getAsBoolean());if(!sign.update(true,false))throw new IllegalStateException("Sign update failed");
 }
}
