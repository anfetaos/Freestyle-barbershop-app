// REEMPLAZA este ID con el ID de tu propia Google Sheet si el script no está vinculado directamente (no es Container-Bound):
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
      case 'ping':
        result = { version: "2.0", isGastoSupported: true, detail: "Conexión exitosa con Google Sheets API v2.0" };
        break;
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
      case 'eliminarCita':
        result = deleteAppointment(payload.id);
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
      case 'guardarGasto':
        result = saveExpense(payload.expense);
        break;
      case 'guardarAdelanto':
        result = saveAdelanto(payload.adelanto);
        break;
      case 'editarAdelanto':
        result = editAdelanto(payload.id, payload.adelanto);
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
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    }
  } catch (e) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
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
    else if (name == "adelantos") sheet.appendRow(['id','fecha','usuario','nombre','monto','tipo','motivo','estado']);
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

  // Ensure "id" column is present in headers of "citas"
  if (name == "citas" && !isEmpty) {
    var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
    if (headers.indexOf('id') === -1) {
      sheet.getRange(1, headers.length + 1).setValue('id');
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
  
  // Set B column (Hora) format to plain text to prevent 1899 epoch Bogota offset shift
  if (name == "citas") {
    sheet.getRange("B:B").setNumberFormat("@");
  }
  
  return sheet;
}

function normalizeTimeToHHMM(valStr) {
  var str = String(valStr || "").trim();
  if (!str) return "09:30";
  
  var hh = 9;
  var mm = 30;
  var parsed = false;
  
  var match24 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    hh = parseInt(match24[1], 10);
    mm = parseInt(match24[2], 10);
    parsed = true;
  } else {
    var match12 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)$/i);
    if (match12) {
      hh = parseInt(match12[1], 10);
      mm = parseInt(match12[2], 10);
      var ampm = match12[3].toLowerCase();
      
      if (ampm === "pm" && hh < 12) {
        hh += 12;
      } else if (ampm === "am" && hh === 12) {
        hh = 0;
      }
      parsed = true;
    } else if (str.indexOf('T') !== -1) {
      var parts = str.split('T');
      var timePart = parts[1] || "";
      if (timePart.length >= 5) {
        var matchSplit = timePart.match(/^(\d{1,2}):(\d{2})/);
        if (matchSplit) {
          hh = parseInt(matchSplit[1], 10);
          mm = parseInt(matchSplit[2], 10);
          parsed = true;
        }
      }
    } else {
      var genericMatch = str.match(/^(\d{1,2}):(\d{2})/);
      if (genericMatch) {
        hh = parseInt(genericMatch[1], 10);
        mm = parseInt(genericMatch[2], 10);
        parsed = true;
      }
    }
  }
  
  if (parsed) {
    // Correct the 4-minute timezone shift from Google Sheets 1899 epoch logic (which had -04:56 local offset for America/Bogota)
    if (mm === 26 || mm === 25 || mm === 27) {
      mm = 30;
    } else if (mm === 56 || mm === 55 || mm === 57) {
      mm = 0;
      hh = (hh + 1) % 24;
    }
    
    var hStr = hh < 10 ? '0' + hh : String(hh);
    var mStr = mm < 10 ? '0' + mm : String(mm);
    return hStr + ":" + mStr;
  }
  
  return "09:30";
}

function getRows(sheet) {
  var ss = sheet.getParent();
  var tz = ss.getSpreadsheetTimeZone() || "America/Bogota";
  var data = sheet.getDataRange().getValues();
  var displayData = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return [];
  var headers = data.shift().map(function(h) { 
    return String(h).trim().toLowerCase(); 
  });
  displayData.shift();
  
  return data.map(function(row, index) {
    var obj = {};
    headers.forEach(function(h, i) {
      if (h) {
        var val = row[i];
        if (h === "hora") {
          obj[h] = normalizeTimeToHHMM(displayData[index][i]);
        } else if (val instanceof Date) {
          // Check if it's date-only
          if (val.getHours() === 0 && val.getMinutes() === 0) {
            obj[h] = Utilities.formatDate(val, tz, "yyyy-MM-dd");
          } else {
            obj[h] = Utilities.formatDate(val, tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
          }
        } else {
          obj[h] = val;
        }
      }
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
    config: getRows(getSheet("config")),
    adelantos: getRows(getSheet("adelantos"))
  };
}

function saveExpense(expense) {
  var sheet = getSheet("gastos");
  sheet.appendRow([
    expense.fecha,
    expense.categoria,
    expense.descripcion,
    expense.monto,
    expense.usuario
  ]);
  return true;
}

function saveAdelanto(a) {
  var sheet = getSheet("adelantos");
  sheet.appendRow([
    a.id || Utilities.getUuid(),
    a.fecha,
    a.usuario,
    a.nombre,
    a.monto,
    a.tipo,
    a.motivo || "",
    a.estado || "pendiente"
  ]);
  return true;
}

function editAdelanto(id, fields) {
  var sheet = getSheet("adelantos");
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('id');
  
  if (idCol === -1) return false;
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === String(id).trim()) {
      for (var key in fields) {
        var col = headers.indexOf(key.toLowerCase());
        if (col > -1) {
          sheet.getRange(i + 1, col + 1).setValue(fields[key]);
        }
      }
      return true;
    }
  }
  return false;
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
    "'" + apt.hora, // Prepend single quote to force Plain Text storage and avoid 1899 shifts
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

function findAppointmentRowIndex(sheet, id) {
  var data = sheet.getDataRange().getValues();
  var displayData = sheet.getDataRange().getDisplayValues();
  var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('id');
  
  var fechaCol = headers.indexOf('fecha');
  var horaCol = headers.indexOf('hora');
  var clienteCol = headers.indexOf('cliente');
  
  var idStr = String(id || "").trim();
  
  var parts = idStr.split('_');
  var hasParsedParts = false;
  var parsedFecha = "";
  var parsedHora = "";
  var parsedCliente = "";
  if (parts.length >= 3 && parts[0].match(/^\d{4}-\d{2}-\d{2}$/) && parts[1].match(/^\d{2}:\d{2}$/)) {
    hasParsedParts = true;
    parsedFecha = parts[0];
    parsedHora = parts[1];
    parsedCliente = parts.slice(2).join('_').trim().toLowerCase();
  }

  for (var i = 1; i < data.length; i++) {
    if (idCol > -1 && data[i][idCol] && String(data[i][idCol]).trim() === idStr) {
      return i + 1;
    }
    
    var rawFecha = data[i][fechaCol];
    var rawCliente = data[i][clienteCol];
    var strCliente = String(rawCliente || "").trim();
    
    var fmtFecha = "";
    if (rawFecha instanceof Date) {
      fmtFecha = Utilities.formatDate(rawFecha, "America/Bogota", "yyyy-MM-dd");
    } else {
      fmtFecha = String(rawFecha || "").trim();
      if (fmtFecha.match(/^\d{4}-\d{2}-\d{2}T/)) {
        fmtFecha = fmtFecha.split('T')[0];
      }
    }
    
    var fmtHora = normalizeTimeToHHMM(displayData[i][horaCol]);
    
    var compositeIdPattern1 = fmtFecha + fmtHora + strCliente;
    var compositeIdPattern2 = fmtFecha + "_" + fmtHora + "_" + strCliente;
    var rawStringId = String(rawFecha) + String(displayData[i][horaCol]) + String(rawCliente);
    
    if (compositeIdPattern1 === idStr || 
        compositeIdPattern2 === idStr || 
        rawStringId === idStr ||
        compositeIdPattern2.toLowerCase() === idStr.toLowerCase() ||
        compositeIdPattern1.toLowerCase() === idStr.toLowerCase()) {
      return i + 1;
    } else if (hasParsedParts) {
      if (fmtFecha === parsedFecha && fmtHora === parsedHora && strCliente.toLowerCase() === parsedCliente) {
        return i + 1;
      }
    }
  }
  return -1;
}

function editAppointment(id, apt) {
  var sheet = getSheet("citas");
  var rowIdx = findAppointmentRowIndex(sheet, id);
  if (rowIdx === -1) {
    throw new Error("Cita no encontrada: " + id);
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
  for (var key in apt) {
    var col = headers.indexOf(key.toLowerCase());
    if (col > -1) {
      var val = apt[key];
      if (key.toLowerCase() === "hora") {
        val = "'" + val; // Prepend single quote to force Plain Text
      }
      sheet.getRange(rowIdx, col + 1).setValue(val);
    }
  }
  return true;
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

function deleteAppointment(id) {
  var sheet = getSheet("citas");
  var rowIdx = findAppointmentRowIndex(sheet, id);
  if (rowIdx === -1) {
    return false;
  }
  sheet.deleteRow(rowIdx);
  return true;
}
