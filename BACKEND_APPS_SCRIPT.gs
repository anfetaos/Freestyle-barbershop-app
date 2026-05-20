var SPREADSHEET_ID = "1oFtB5U0sGwF5z8SpMMT4eni0wSLUwZoHIJCZ-EqrjOc";

function doGet(e) {
  return HtmlService.createHtmlOutput("Freestyle Barbershop API Active - v2.0");
}

function doPost(e) {
  try {
    var body = e.postData.contents;
    var payload = JSON.parse(body);
    var action = payload.action;
    
    var result;
    switch(action) {
      case 'login':
        result = login(payload.usuario, payload.password);
        break;
      case 'loadAllData':
        result = loadAllData();
        break;
      case 'guardarVenta':
        result = saveSale(payload.sale);
        break;
      case 'guardarCita':
        result = saveAppointment(payload.appointment);
        break;
      case 'editarCita':
        result = editAppointment(payload.id, payload.appointment);
        break;
      case 'guardarProducto':
        result = saveProduct(payload.product);
        break;
      case 'editarProducto':
        result = editProduct(payload.id, payload.product);
        break;
      case 'guardarServicio':
        result = saveService(payload.service);
        break;
      case 'editarServicio':
        result = editService(payload.id, payload.service);
        break;
      case 'guardarUsuario':
        result = saveUser(payload.user);
        break;
      case 'editarUsuario':
        result = editUser(payload.id, payload.user);
        break;
      case 'actualizarConfig':
        result = updateConfig(payload.config);
        break;
      default:
        throw new Error("Acción no reconocida: " + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: "success", data: result}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet(name) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  
  // Ensure headers and default data
  var data = sheet.getDataRange().getValues();
  var isEmpty = data.length === 1 && data[0][0] === "";

  if (isEmpty) {
    if (name == "usuarios") sheet.appendRow(['id','usuario','password','nombre','role','activo','porcentaje']);
    else if (name == "servicios") sheet.appendRow(['id','nombre','categoria','precio','duracion','activo']);
    else if (name == "productos") sheet.appendRow(['id','nombre','categoria','costo','venta','stock','activo']);
    else if (name == "ventas") sheet.appendRow(['fecha','tipo','item_id','item_nombre','valor','cantidad','usuario', 'comisionable']);
    else if (name == "citas") sheet.appendRow(['fecha','hora','cliente','telefono','servicio_id','servicio','estado','barbero','id']);
    else if (name == "gastos") sheet.appendRow(['fecha','categoria','descripcion','monto','usuario']);
    else if (name == "config") {
      sheet.appendRow(['key','value','tipo']);
      sheet.appendRow(['nombre_barberia', 'Freestyle Urban Grooming', 'text']);
      sheet.appendRow(['telefono', '300 000 0000', 'text']);
      sheet.appendRow(['direccion', 'Calle 123 # 45-67', 'text']);
      sheet.appendRow(['instagram', '@freestyle_urban', 'text']);
      sheet.appendRow(['iva', '0', 'number']);
      sheet.appendRow(['moneda', 'COP', 'text']);
    }
  }

  // Mandatory check for users to ensure at least default accounts exist
  if (name == "usuarios") {
    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
       sheet.appendRow(['1', 'socio1', '1234', 'Andrés', 'owner', 'TRUE', '0']);
       sheet.appendRow(['2', 'barbero1', '1234', 'Santiago', 'barber', 'TRUE', '60']);
    }
  }
  
  return sheet;
}

function getRows(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data.shift().map(function(h) { 
    return String(h).trim().toLowerCase(); 
  });
  
  return data.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      if (h) obj[h] = row[i];
    });
    return obj;
  });
}

function login(usuario, password) {
  var sheet = getSheet("usuarios");
  var rows = getRows(sheet);
  
  if (rows.length === 0) {
    throw new Error("No hay usuarios registrados en la base de datos.");
  }

  var uSearch = String(usuario).trim().toLowerCase();
  var pSearch = String(password).trim().toLowerCase();

  var user = rows.find(function(r) {
    var uRow = String(r.usuario || "").trim().toLowerCase();
    var pRow = String(r.password || "").trim().toLowerCase();
    return uRow === uSearch && pRow === pSearch;
  });

  if (!user) {
    // Para depuración, el usuario puede ver qué está llegando
    throw new Error("Usuario o contraseña incorrectos. Intente con socio1 / 1234");
  }

  // Verificar si está activo (puede venir como boolean true, "TRUE", o "true")
  var isActive = user.activo === true || user.activo === "TRUE" || user.activo === "true" || user.activo === 1;
  
  if (!isActive) {
    throw new Error("Su cuenta de usuario está desactivada.");
  }

  // Limpiar password antes de enviar al frontend
  delete user.password;
  return user;
}

function loadAllData() {
  return {
    usuarios: getRows(getSheet("usuarios")),
    servicios: getRows(getSheet("servicios")),
    productos: getRows(getSheet("productos")),
    ventas: getRows(getSheet("ventas")),
    citas: getRows(getSheet("citas")),
    gastos: getRows(getSheet("gastos")),
    config: getRows(getSheet("config"))
  };
}

function saveSale(sale) {
  var sheet = getSheet("ventas");
  var items = sale.items;
  items.forEach(function(item) {
    sheet.appendRow([
      sale.fecha,
      item.tipo,
      item.id,
      item.nombre,
      item.valor,
      item.cantidad,
      sale.usuario,
      item.comisionable ? "TRUE" : "FALSE"
    ]);
    if (item.tipo === 'producto') updateStock(item.id, item.cantidad);
  });
  return true;
}

function updateStock(id, qty) {
  var sheet = getSheet("productos");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.getRange(i + 1, 6).setValue(data[i][5] - qty);
      break;
    }
  }
}

function saveAppointment(apt) {
  var sheet = getSheet("citas");
  sheet.appendRow([
    apt.fecha,
    apt.hora,
    apt.cliente,
    apt.telefono,
    apt.servicio_id,
    apt.servicio,
    apt.estado,
    apt.barbero,
    apt.id || Utilities.getUuid()
  ]);
  return true;
}

function editAppointment(id, apt) {
  var sheet = getSheet("citas");
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('id');
  if (idCol === -1) idCol = 0; // Fallback to first column
  
  var fechaCol = headers.indexOf('fecha');
  var horaCol = headers.indexOf('hora');
  var clienteCol = headers.indexOf('cliente');
  
  for (var i = 1; i < data.length; i++) {
    // 1. Match by Raw ID column
    if (data[i][idCol] && String(data[i][idCol]).trim() === String(id).trim()) {
      for (var key in apt) {
        var col = headers.indexOf(key.toLowerCase());
        if (col > -1) sheet.getRange(i + 1, col + 1).setValue(apt[key]);
      }
      return true;
    }
  }
  
  // 2. Fallback: Match by normalized date, time and client if ID-based match failed
  for (var i = 1; i < data.length; i++) {
    var rawFecha = data[i][fechaCol];
    var rawHora = data[i][horaCol];
    var rawCliente = data[i][clienteCol];
    
    var fmtFecha = "";
    if (rawFecha instanceof Date) {
      fmtFecha = Utilities.formatDate(rawFecha, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      fmtFecha = String(rawFecha || "").trim();
      if (fmtFecha.match(/^\d{4}-\d{2}-\d{2}T/)) {
        fmtFecha = fmtFecha.split('T')[0];
      }
    }
    
    var fmtHora = "";
    if (rawHora instanceof Date) {
      fmtHora = Utilities.formatDate(rawHora, Session.getScriptTimeZone(), "HH:mm");
    } else {
      fmtHora = String(rawHora || "").trim();
      if (fmtHora.match(/^\d{4}-\d{2}-\d{2}T/)) {
        fmtHora = fmtHora.split('T')[1].substring(0, 5);
      }
    }
    
    var compositeId1 = fmtFecha + fmtHora + String(rawCliente || "").trim();
    var rawStringId = String(rawFecha) + String(rawHora) + String(rawCliente);
    
    if (compositeId1 === id || rawStringId === id) {
      for (var key in apt) {
        var col = headers.indexOf(key.toLowerCase());
        if (col > -1) sheet.getRange(i + 1, col + 1).setValue(apt[key]);
      }
      return true;
    }
  }
  
  throw new Error("Cita no encontrada");
}

function saveProduct(p) {
  var sheet = getSheet("productos");
  sheet.appendRow([Utilities.getUuid(), p.nombre, p.categoria, p.costo, p.venta, p.stock, p.activo]);
  return true;
}

function editProduct(id, p) {
  var sheet = getSheet("productos");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      for (var key in p) {
        var col = headers.indexOf(key);
        if (col > -1) sheet.getRange(i + 1, col + 1).setValue(p[key]);
      }
      return true;
    }
  }
  return false;
}

function saveService(s) {
  var sheet = getSheet("servicios");
  sheet.appendRow([Utilities.getUuid(), s.nombre, s.categoria, s.precio, s.duracion, s.activo]);
  return true;
}

function editService(id, s) {
  var sheet = getSheet("servicios");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      for (var key in s) {
        var col = headers.indexOf(key);
        if (col > -1) sheet.getRange(i + 1, col + 1).setValue(s[key]);
      }
      return true;
    }
  }
  return false;
}

function saveUser(u) {
  var sheet = getSheet("usuarios");
  sheet.appendRow([Utilities.getUuid(), u.usuario, u.password, u.nombre, u.role, u.activo, u.porcentaje]);
  return true;
}

function editUser(id, u) {
  var sheet = getSheet("usuarios");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      for (var key in u) {
        var col = headers.indexOf(key);
        if (col > -1) sheet.getRange(i + 1, col + 1).setValue(u[key]);
      }
      return true;
    }
  }
  return false;
}

function updateConfig(configs) {
  var sheet = getSheet("config");
  sheet.clear();
  sheet.appendRow(['key','value','tipo']);
  configs.forEach(function(c) {
    sheet.appendRow([c.key, c.value, c.tipo]);
  });
  return true;
}
